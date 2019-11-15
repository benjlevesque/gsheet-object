import {
  letterToColumn,
  columnToLetter,
  arrayToObject,
  rowToObject,
  sheetToArray,
  sheetToObject
} from "../src/lib";

const gsheetData = [
  ["id", "FirstName", "Last name"],
  ["0", "Alice", "DOE"],
  ["1", "Bob", "SMITH"]
];

describe("sheetToObject", () => {
  it("should convert a GoogleSheet array to an array based on header row and a key selector", () => {
    const arr = sheetToObject<any>(gsheetData, x => x.firstName);

    expect(arr).toEqual({
      Alice: {
        _row: 1,
        id: "0",
        firstName: "Alice",
        lastName: "DOE"
      },
      Bob: {
        _row: 2,
        id: "1",
        firstName: "Bob",
        lastName: "SMITH"
      }
    });
  });
});

describe("sheetToArray", () => {
  it("should convert a GoogleSheet array to an array based on header row", () => {
    const arr = sheetToArray(gsheetData);

    expect(arr).toEqual([
      {
        _row: 1,
        id: "0",
        firstName: "Alice",
        lastName: "DOE"
      },
      {
        _row: 2,
        id: "1",
        firstName: "Bob",
        lastName: "SMITH"
      }
    ]);
  });
});

describe("rowToObject", () => {
  it("should convert a GoogleSheet row to an array based on header row", () => {
    const obj = rowToObject(gsheetData[1], gsheetData[0]);
    expect(obj).toEqual({
      id: "0",
      firstName: "Alice",
      lastName: "DOE"
    });
  });
});

describe("arrayToObject", () => {
  it("should return an object with selected property as key", () => {
    const array = [
      { foo: "bar1", baz: 0 },
      { foo: "bar2", baz: 1 }
    ];

    const obj = arrayToObject(array, x => x.foo);

    expect(obj).toEqual({
      bar1: { foo: "bar1", baz: 0 },
      bar2: { foo: "bar2", baz: 1 }
    });
  });
});

describe("columnToLetter", () => {
  it("should return the letter equivalent of an index", () => {
    expect(columnToLetter(0)).toBe("");
    expect(columnToLetter(1)).toBe("A");
    expect(columnToLetter(26)).toBe("Z");
    expect(columnToLetter(27)).toBe("AA");
  });
});

describe("letterToColumn", () => {
  it("should return the index equivalent of the column", () => {
    expect(letterToColumn("")).toBe(0);
    expect(letterToColumn("A")).toBe(1);
    expect(letterToColumn("Z")).toBe(26);
    expect(letterToColumn("AA")).toBe(27);
  });
});
