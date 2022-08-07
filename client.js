'use strict';

const mqtt = require('async-mqtt');

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
        this.#messageHandlers.get(name)(msg);
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
   * * ro: 1
   * * he: 0
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
}

const regexpMac = /^[a-fA-F0-9]{12}$/g;

function validateMac(mac) {
  return regexpMac.test(mac);
}

module.exports = Client;
