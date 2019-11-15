import dotenv from "dotenv";
import { GoogleSheet } from "./google-sheet";
dotenv.config();

interface ICity {
  city: string;
  countryName: string;
}

(async () => {
  const sheet = new GoogleSheet<ICity>("Cities");

  await sheet.init();

  const cities = await sheet.getData();
  console.log(cities[1].countryName || "not found"); // France

  // const indexed = await sheet.getIndexed(x => x.city);
  // console.log(indexed["Paris"]); // { city: 'Paris', countryName: 'France', _row: 2 }

  // const pairs = await sheet.getPairs(x => x.city, x => x.countryName);
  // console.log(pairs["Paris"]); // France

  // await sheet.append({
  //   city: "Toulouse",
  //   countryName: "France"
  // });

  // await sheet.update(cities[2], "countryName", "USA");
  // await sheet.delete(cities[2]);
})();
