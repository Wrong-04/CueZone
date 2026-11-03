import { EventEmitter } from "events";

class OrderEventEmitter extends EventEmitter {}

export const orderEvents = new OrderEventEmitter();
orderEvents.setMaxListeners(50);

