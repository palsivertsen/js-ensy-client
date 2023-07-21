import mqtt from "async-mqtt";
import { EventEmitter } from "node:events";

const regexpMacAddress = /^[a-f0-9]{12}$/g;

export default class Client {
  #unitId;
  #client;
  #eventEmitter;

  constructor(unitId) {
    if (!regexpMacAddress.test(unitId)) {
      throw new Error(
        `unit id should be a lowercase hexadecimal number with length 12, got: '${unitId}'`
      );
    }

    this.#unitId = unitId;

    this.#client = mqtt.connect("ws://app.ensy.no:9001/mqtt", {
      clientId: `js-ensy-client_${Math.random().toString(16).substr(2, 8)}`,
    });

    this.#client.on("connect", () => {
      this.#client.subscribe(`units/${this.#unitId}/unit/+`);
    });

    this.#eventEmitter = new EventEmitter();
    this.#client.on("message", (topic, message) => {
      const topicTokens = topic.split("/");
      if (topicTokens.length !== 4) {
        throw new Error(`Unsupported topic: ${topic}`);
      }

      const eventName = topicTokens[3];
      const messageString = message.toString();
      this.#eventEmitter.emit(eventName, messageString);
    });
  }

  addListener(eventName, listener) {
    this.#eventEmitter.addListener(eventName, listener);
  }

  async end() {
    return await this.#client.end();
  }

  async setRaw(action, value) {
    await this.#client.publish(`units/${this.#unitId}/app/${action}`, value);
  }

  /**
   * Set absent
   * @param {string} num "0" to disable, "1" to enable
   */
  async setAbsent(num) {
    await this.setRaw(Actions.Absent, num);
  }

  /**
   * Set countdown for party mode
   * @param {string} minutes Number of minutes
   */
  async setCountdown(minutes) {
    await this.setRaw(Actions.Countdown, minutes);
  }

  /**
   * Set speed of fan
   * @param {string} speed "1", "2", or "3"
   */
  async setFanSpeed(speed) {
    if (speed <= 0 || speed > 3) {
      throw new Error(`invalid speed: ${speed}`);
    }
    await this.setRaw(Actions.FanSpeed, speed);
  }

  /**
   * Set party mode
   * @param {string} mode "1" for start and "2" for stop
   */
  async setPartyMode(mode) {
    await this.setRaw(Actions.Party, mode);
  }

  /**
   * Set target temperature
   * @param {string} temperatureC Temperature in Celcius
   */
  async setTemperature(temperatureC) {
    await this.setRaw(Actions.Temperature, temperatureC);
  }
}

export class Events {
  static Absent = new Events("absent");
  static AlarmExtractFan = new Events("aef");
  static AlarmLowTemperatureSupplyAir = new Events("altsa");
  static AlarmOverheating = new Events("ao");
  static AlarmSupplyFan = new Events("asf");
  static Countdown = new Events("countdown");
  static FanSpeed = new Events("fan");
  static FilterAlarm = new Events("fa");
  static HeatExchanger = new Events("ro");
  static HeatingElement = new Events("he");
  static HumiditySensor = new Events("d2");
  static KitchenVentilator = new Events("kv");
  static Overheating = new Events("overheating");
  static Party = new Events("party");
  static RotorMalfunction = new Events("rm");
  static Status = new Events("status");
  static TemeratureExhaustAir = new Events("texauh");
  static Temperature = new Events("temperature");
  static TemperatureExtractAir = new Events("textr");
  static TemperatureOutsideAir = new Events("tout");
  static TemperatureSupplyAir = new Events("tsupl");

  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

export class Actions {
  static Absent = new Actions("absent");
  static Countdown = new Actions("countdown");
  static FanSpeed = new Actions("fan");
  static Party = new Actions("party");
  static Temperature = new Actions("temperature");

  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}
