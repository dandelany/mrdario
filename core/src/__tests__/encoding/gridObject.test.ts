import { colorEncodingMap, gridObjectTypeEncodingMap } from "../../encoding";
import { uniq, values } from "lodash";


function hasDuplicates(arr: (string | number)[]): boolean {
  const strArr: string[] = arr.map((d: string | number) => d + "");
  return uniq(strArr).length !== strArr.length;
}

describe("Grid Object Encoding", () => {
  test("gridObjectTypeEncodingMap", () => {
    const binaryVals: number[] = values(gridObjectTypeEncodingMap);
    // expect encoded values to be unique
    expect(hasDuplicates(binaryVals)).toBeFalsy();
    expect(
      binaryVals.every((val: number) => {
        return val < 0b1000;
      })
    ).toBeTruthy();
  });
  test("colorEncodingMap", () => {
    const binaryVals: number[] = values(colorEncodingMap);
    expect(hasDuplicates(binaryVals)).toBeFalsy();
    expect(
      binaryVals.every((val: number) => {
        return val < 0b100000 && (val === 0 || val > 0b111);
      })
    ).toBeTruthy();
  });
  // todo test encoder & decoder
});
