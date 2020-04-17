import { google, sheets_v4 } from "googleapis";
import debug from "debug";
import camelCase from "lodash/camelCase";
import { OAuth2Client } from "google-auth-library";

import {
  sheetToArray,
  sheetToObject,
  arrayToObject,
  columnToLetter,
  WithRow,
} from "./lib";

interface IGoogleSheetOptions {
  spreadsheetId: string;
  sheetName?: string;
  auth?: string | OAuth2Client;
  range?: string;
  headerRange?: string;
}

export class GoogleSheet<T> {
  private sheetsApi?: sheets_v4.Sheets;
  private options: IGoogleSheetOptions;
  private logger = debug("gsheet-object");

  static async load<T>(
    options?: Partial<IGoogleSheetOptions> | string
  ): Promise<GoogleSheet<T>> {
    const sheet = new GoogleSheet<T>(options);
    await sheet.init();
    return sheet;
  }

  constructor(options?: Partial<IGoogleSheetOptions> | string) {
    const defaultOptions = {
      spreadsheetId: process.env.SPREADSHEET_ID || "",
      sheetName: process.env.SHEET_NAME,
      auth: process.env.GOOGLE_CREDENTIALS,
    };

    this.options =
      typeof options === "string"
        ? {
            ...defaultOptions,
            sheetName: options,
          }
        : {
            ...defaultOptions,
            ...options,
          };

    if (!this.options.spreadsheetId) throw new Error("Missing spreadsheetId");
    // if (!this.options.auth) throw new Error("Missing auth or credentials");
  }

  public async init() {
    this.logger("init sheets api");

    if (!this.options.auth) {
      const auth = await google.auth.getClient({
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/devstorage.read_only",
        ],
      });
      this.options.auth = auth;
    } else if (typeof this.options.auth === "string") {
      const credentials = JSON.parse(this.options.auth);
      if (!credentials.client_email && credentials.private_key) {
        throw new Error(
          "auth must be a valid JSON credentials containing client_email and private_key"
        );
      }
      let jwt = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ["https://www.googleapis.com/auth/spreadsheets"]
      );
      await jwt.authorize();
      this.options.auth = jwt;
    }
    this.sheetsApi = google.sheets({ version: "v4", auth: this.options.auth });
    const spreadsheet = await this.sheetsApi.spreadsheets.get({
      spreadsheetId: this.options.spreadsheetId,
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
  ): Promise<Record<string, T>> {
    const result = await this.loadData();
    return sheetToObject<T>(result, keySelector) as Record<string, T>;
  }

  public async getPairs<U>(
    keySelector: (obj: T) => string,
    valueSelector: (obj: T) => U
  ): Promise<Record<string, U>> {
    const result = await this.loadData();
    const obj = sheetToObject<T, U>(result, keySelector, valueSelector);
    return obj as Record<string, U>;
  }

  public async getData(): Promise<WithRow<T>[]> {
    const result = await this.loadData();
    return sheetToArray<T>(result);
  }

  private async loadData(range?: string): Promise<any[][]> {
    if (!this.sheetsApi) {
      throw new Error("you must call init before loading data");
    }
    const spreadsheetId = this.options.spreadsheetId;
    if (!range) {
      range = this.options.range!;
    }
    this.logger(`Get range ${range} spreadsheet ${spreadsheetId}`);
    const result = await this.sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: "ROWS",
      range,
    });

    if (!result.data.values) return [];
    return result.data.values;
  }

  private async getHeaders() {
    const dataHeaders = (await this.loadData(this.options.headerRange))[0];
    const headers = arrayToObject(
      dataHeaders,
      key => camelCase(key),
      (_val, index) => index
    );
    return headers;
  }

  public async append(obj: T): Promise<void> {
    if (!this.sheetsApi) {
      throw new Error("you must call init before appending data");
    }
    const headers = await this.getHeaders();
    const data = Object.keys(obj)
      .sort(key => headers[key])
      .map(key => {
        return (obj as any)[key];
      });

    const spreadsheetId = this.options.spreadsheetId;
    const range = this.options.range;
    this.logger(`Append range ${range} in spreadsheet ${spreadsheetId}`);

    await this.sheetsApi.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [data],
      },
    });
  }

  public async update(
    rowOrNumber: WithRow<T> | number,
    propertyName: Extract<keyof T, string>,
    value: any
  ): Promise<void> {
    if (!this.sheetsApi) {
      throw new Error("you must call init before updating data");
    }
    const spreadsheetId = this.options.spreadsheetId;

    const row =
      typeof rowOrNumber === "number" ? Number(rowOrNumber) : rowOrNumber._row;

    const headers = await this.getHeaders();
    const sheetName = this.options.sheetName
      ? this.options.sheetName + "!"
      : "";
    const range = `${sheetName}${columnToLetter(
      headers[propertyName] + 1
    )}${row + 1}`;
    this.logger(
      `Update range ${range}=${value} in spreadsheet ${spreadsheetId}`
    );

    await this.sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]],
      },
    });
  }

  public async delete(obj: WithRow<T>) {
    if (!this.sheetsApi) {
      throw new Error("you must call init before deleting data");
    }
    const spreadsheetId = this.options.spreadsheetId;

    const headers = await this.getHeaders();
    const range = `A${obj._row + 1}:${columnToLetter(
      Object.keys(headers).length
    )}${obj._row + 1}`;
    this.logger(`Clear range ${range} in spreadsheet ${spreadsheetId}`);

    await this.sheetsApi.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }
}
