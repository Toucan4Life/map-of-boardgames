function log(caller: string, ...args: any[]) {
  const callerName = caller
  console.log(`%c${callerName}`, 'color: #0f0;', ...args)
}

log.error = function (caller: string, ...args: any) {
  const callerName = caller
  console.log(`%c${callerName}`, 'color: #f00;', ...args)
}

export default log
