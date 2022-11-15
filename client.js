'use strict';

const mqtt = require('async-mqtt');
const FanSpeed_low = '1';
const FanSpeed_normal = '2';
const FanSpeed_high = '3';

class Client {

  #unitId;
  #client;
  #messageHandlers;

  constructor(unitId) {
    if (!validateMac(unitId)) {
      throw new Error(`Invalid unit id "${unitId}"`);
    }
    this.#unitId = unitId;

    this.#client = mqtt.connect(
      'ws://app.ensy.no:9001/mqtt',
      {
        clientId: `js-ensy-client_${Math.random().toString(16).substr(2, 8)}`,
      },
    );

    this.#client.on('connect', () => {
      this.#client.subscribe(`units/${this.#unitId}/unit/#`);
    });

    this.#messageHandlers = new Map();
    this.#client.on('message', (topic, msg) => {
      // console.log(`New message from ${topic}: ${msg.toString()}`);
      const words = topic.split('/');
      if (words.length !== 4) {
        throw new Error(`Unsupported topic: ${topic}`);
      }

      const name = words[3];

      if (this.#messageHandlers.has(name)) {
        this.#messageHandlers.get(name)(msg.toString());
      }
    });
  }

  async end() {
    return await this.#client.end();
  }

  /*
   * Known events:
   * * status: online
   * * temperature: 20
   * * fan: 2
   * * countdown: 240
   * * d2: 0
   * * party: 2
   * * ro: 1 // Exchanger ??
   * * he: 0 // Heating element
   * * absent: 0
   * * kv: 0
   * * asf: 0
   * * aef: 0
   * * ao: 0
   * * altsa: 0
   * * rm: 0
   * * fa: 0
   * * tsupl: 20
   * * textr: 25
   * * tout: 12
   * * overheating: 20
   * * texauh: 2
   */
  setHandler(name, hand) {
    this.#messageHandlers.set(name, hand);
  }

  removeHandler(name) {
    this.#messageHandlers.delete(name);
  }

  async setFanSpeed(speed) {
    if (speed <= 0 || speed > 3) {
      throw new Error(`invalid speed: ${speed}`);
    }
    await this.#client.publish(`units/${this.#unitId}/app/fan`, speed);
  }

  async setAbsent(num) {
    await this.#client.publish(`units/${this.#unitId}/app/absent`, num);
  }

  async setTargetTemperature(num) {
    await this.#client.publish(`units/${this.#unitId}/app/temerature`, num);
  }
}

const regexpMac = /^[a-fA-F0-9]{12}$/g;

function validateMac(mac) {
  return regexpMac.test(mac);
}

exports.Client = Client;
exports.FanSpeed_low = FanSpeed_low;
exports.FanSpeed_normal = FanSpeed_normal;
exports.FanSpeed_high = FanSpeed_high;
