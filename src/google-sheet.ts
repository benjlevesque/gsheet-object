import { google, sheets_v4 } from "googleapis";
import debug from "debug";
import {
  sheetToArray,
  sheetToObject,
  Indexed,
  arrayToObject,
  columnToLetter,
  WithRow
} from "./lib";
import camelCase from "lodash/camelCase";

interface IGoogleSheetOptions {
  spreadsheetId: string;
  sheetName?: string;
  credentials: any;
  range?: string;
  headerRange?: string;
}

export class GoogleSheet<T> {
  private sheetsApi?: sheets_v4.Sheets;
  private options: IGoogleSheetOptions;
  private logger = debug("sheet");

  constructor(options?: Partial<IGoogleSheetOptions> | string) {
    const defaultOptions = {
      spreadsheetId: process.env.SPREADSHEET_ID || "",
      sheetName: process.env.SHEET_NAME,
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || "")
    };

    this.options =
      typeof options === "string"
        ? {
            ...defaultOptions,
            sheetName: options
          }
        : {
            ...defaultOptions,
            ...options
          };

    if (!this.options.spreadsheetId) throw new Error("Missing spreadsheetId");
    if (!this.options.credentials) throw new Error("Missing credentials");
  }

  public async init() {
    this.logger("init sheets api");

    const auth = new google.auth.JWT(
      this.options.credentials.client_email,
      undefined,
      this.options.credentials.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    await auth.authorize();
    this.sheetsApi = google.sheets({ version: "v4", auth });
    const spreadsheet = await this.sheetsApi.spreadsheets.get({
      spreadsheetId: this.options.spreadsheetId
    });
    const sheet = this.options.sheetName
      ? spreadsheet.data.sheets!.find(
          s =>
            s.properties!.title!.toLowerCase() ===
            this.options.sheetName!.toLowerCase()
        )
      : spreadsheet.data.sheets![0];

    if (!sheet) {
      throw new Error(`Sheet ${this.options.sheetName} not found`);
    }
    const { gridProperties, title } = sheet.properties!;
    const { columnCount, rowCount } = gridProperties!;
    if (!this.options.range) {
      this.options.range = `${title}!A1:${columnToLetter(
        columnCount!
      )}${rowCount!}`;
    }
    if (!this.options.headerRange) {
      this.options.headerRange = `${title}!A1:${columnToLetter(columnCount!)}1`;
    }
  }

  public async getIndexed(
    keySelector: (obj: T) => string
  ): Promise<Indexed<T>> {
    const result = await this.loadData();
    return sheetToObject<T>(result, keySelector) as Indexed<T>;
  }

  public async getPairs<U>(
    keySelector: (obj: T) => string,
    valueSelector: (obj: T) => U
  ): Promise<Indexed<U>> {
    const result = await this.loadData();
    return sheetToObject<T, U>(result, keySelector, valueSelector) as Indexed<
      U
    >;
  }

  public async getData(): Promise<WithRow<T>[]> {
    const result = await this.loadData();
    return sheetToArray<T>(result);
  }

  private async loadData(range?: string): Promise<any[][]> {
    const spreadsheetId = this.options.spreadsheetId;
    if (!range) {
      range = this.options.range!;
    }
    this.logger(`Get range ${range} spreadsheet ${spreadsheetId}`);
    const result = await this.sheetsApi!.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: "ROWS",
      range
    });

    if (!result.data.values) return [];
    return result.data.values;
  }

  private async getHeaders() {
    const dataHeaders = (await this.loadData(this.options.headerRange))[0];
    const headers = arrayToObject(
      dataHeaders,
      key => camelCase(key),
      (val, index) => index
    );
    return headers;
  }

  public async append(obj: T): Promise<void> {
    const headers = await this.getHeaders();
    const data = Object.keys(obj)
      .sort(key => headers[key])
      .map(key => {
        return (obj as any)[key];
      });

    const spreadsheetId = this.options.spreadsheetId;
    const range = this.options.range;
    this.logger(`Append range ${range} in spreadsheet ${spreadsheetId}`);

    await this.sheetsApi!.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [data]
      }
    });
  }

  public async update(
    obj: WithRow<T>,
    propertyName: Extract<keyof T, string>,
    value: any
  ): Promise<void> {
    const spreadsheetId = this.options.spreadsheetId;

    const headers = await this.getHeaders();
    const range = `${columnToLetter(headers[propertyName] + 1)}${obj._row + 1}`;
    this.logger(`Update range ${range} in spreadsheet ${spreadsheetId}`);

    await this.sheetsApi!.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]]
      }
    });
  }

  public async delete(obj: WithRow<T>) {
    const spreadsheetId = this.options.spreadsheetId;

    const headers = await this.getHeaders();
    const range = `A${obj._row + 1}:${columnToLetter(
      Object.keys(headers).length
    )}${obj._row + 1}`;
    this.logger(`Clear range ${range} in spreadsheet ${spreadsheetId}`);

    await this.sheetsApi!.spreadsheets.values.clear({
      spreadsheetId,
      range
    });
  }
}
