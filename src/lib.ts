import camelCase from "lodash/camelCase";

export type WithRow<T> = T & { _row: number };

export function sheetToObject<T, U = {}>(
  data: any[][],
  keySelector: (obj: T) => string,
  valueSelector?: (obj: T, index: number) => U
): Record<string, T | U> {
  const array = sheetToArray<T>(data);
  return arrayToObject<T, U>(array, keySelector, valueSelector);
}

// converts google sheet to a usable object array, where the header name is the field name
export function sheetToArray<T>(data: any[][]): WithRow<T>[] {
  return data.slice(1).reduce((acc, curr, index) => {
    const item = rowToObject<WithRow<T>>(curr, data[0]);
    item._row = index + 1;
    return [...acc, item];
  }, []);
}

// converts google sheet row to a usable object, where the header name is the field name
export function rowToObject<T>(rowData: any[], headers: string[]): T {
  return rowData.reduce((acc, curr, index) => {
    acc[camelCase(headers[index])] = curr;
    return acc as T;
  }, {});
}

export function arrayToObject<T, U = {}>(
  array: T[],
  keySelector: (obj: T) => string,
  valueSelector?: (obj: T, index: number) => U
) {
  return array.reduce((acc, curr, index) => {
    acc[keySelector(curr)] = valueSelector ? valueSelector(curr, index) : curr;
    return acc;
  }, {} as Record<string, T | U>);
}

export function columnToLetter(column: number): string {
  var temp,
    letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export function letterToColumn(letter: string): number {
  var column = 0,
    length = letter.length;
  for (var i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

export function nameToColumn(headers: string[], name: string): number {
  return headers.map(camelCase).indexOf(name);
}
export function columnToName(headers: string[], column: number): string {
  return headers.map(camelCase)[column];
}
