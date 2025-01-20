function log(caller: { name: any; }, ...args: any[]) {
  const callerName = caller.name || caller;
  console.log(`%c${callerName}`, 'color: #0f0;', ...args);
}

log.error = function(caller: { name: any; }, ...args: any) {
  const callerName = caller.name || caller;
  console.log(`%c${callerName}`, 'color: #f00;', ...args);
}

export default log;