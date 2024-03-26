# gsheet-object

## Install

```
yarn add gsheet-object googleapis
```

## Usage

You first need to set an environment variable to your sheet ID: `SPREADSHEET_ID=YOUR SHEET ID`

Let's use a sheet called Cities, with the following data:

| City   | Country Name |
| ------ | ------------ |
| Paris  | France       |
| London | UK           |

```typescript
interface ICity {
  city: string;
  countryName: string;
}

async function demo() {
  const sheet = await GoogleSheet.load<ICity>("Cities");
  const cities = await sheet.getData();

  const paris = cities[0]; // { city: 'Paris', countryName: 'France', _row: 1 }

  const indexed = await sheet.getIndexed(x => x.city);
  console.log(indexed["Paris"]); // { city: 'Paris', countryName: 'France', _row: 1 }

  const pairs = await sheet.getPairs(
    x => x.city,
    x => x.countryName
  );
  console.log(pairs["Paris"]); // France

  await sheet.append({
    city: "Toulouse",
    countryName: "France",
  });

  // Update line
  await sheet.update(paris, "countryName", "USA");
  // or
  await sheet.update(0, "countryName", "USA");

  await sheet.delete(paris);
}
```
