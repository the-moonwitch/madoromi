// Runs a function as soon as the event loop is free, without the 1 s clamp background tabs put
// on setTimeout: long jobs split into steps finish promptly even while the tab is hidden.
const channel = new MessageChannel();
const queue: (() => void)[] = [];
channel.port1.onmessage = () => queue.shift()?.();
export function nextTask(fn: () => void): void {
  queue.push(fn);
  channel.port2.postMessage(0);
}
