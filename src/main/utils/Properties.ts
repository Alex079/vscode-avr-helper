export function parseProperties(str: string): any {
  return str
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => line.trim().split(/\s*=\s*/, 2))
    .reduce((res: any, [k, v]) => {
      res[k] = v;
      return res;
    }, {});
}

export function stringifyProperties(res: any): string {
  return Object.entries(res)
    .map(([k, v]) => `${k} = ${v}`)
    .join('\n');
}
