import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";

import { numEnumType, strEnumType, tJSONString } from "./io";
import { expectToDecodeWithAndEqual, toDecodeWith } from "./jest";
import { isLeft } from "fp-ts/lib/Either";

expect.extend({ toDecodeWith });

describe("io-ts Utilities", () => {
  describe("strEnumType", () => {
    test("Creates codec for string enum", () => {
      enum Fruit {
        Apple = "ap",
        Orange = "or",
        Lemon = "le"
      }
      const tFruit = strEnumType<Fruit>(Fruit, "Fruit");

      expectToDecodeWithAndEqual("or", tFruit, "or");
      expectToDecodeWithAndEqual("or", tFruit, Fruit.Orange);

      const bad1 = tFruit.decode("Apple");
      expect(bad1).not.toDecodeWith(tFruit);

      const bad2 = tFruit.decode(9);
      expect(bad2).not.toDecodeWith(tFruit);

      // expect(tFruit.is('ap')).toBe(true);
      // expect(tFruit.is('or')).toBe(true);
      // expect(tFruit.is('le')).toBe(true);
      // expect(tFruit.is('Orange')).toBe(false);
      // expect(tFruit.is(0)).toBe(false);
    });
  });
  describe("numEnumType", () => {
    test("Creates codec for default numeric enum", () => {
      enum Vehicle {
        Bike,
        Car
      }
      const tVehicle = numEnumType<Vehicle>(Vehicle, "Vehicle");

      expectToDecodeWithAndEqual(Vehicle.Car, tVehicle, Vehicle.Car);
      expectToDecodeWithAndEqual(Vehicle.Car, tVehicle, 1);

      const bad1 = tVehicle.decode("Bike");
      // expect(bad1.isRight()).toBe(false);
      expect(bad1).not.toDecodeWith(tVehicle);

      const bad2 = tVehicle.decode(4);
      expect(bad2).not.toDecodeWith(tVehicle);
    });
    test("Creates codec for numeric enum with specified numbers", () => {
      enum Vehicle {
        Bike = 2,
        Car = 4
      }
      const tVehicle = numEnumType<Vehicle>(Vehicle, "Vehicle");

      expectToDecodeWithAndEqual(Vehicle.Car, tVehicle, Vehicle.Car);
      expectToDecodeWithAndEqual(Vehicle.Car, tVehicle, 4);

      const bad1 = tVehicle.decode("Bike");
      expect(bad1).not.toDecodeWith(tVehicle);

      const bad2 = tVehicle.decode(0);
      expect(bad2).not.toDecodeWith(tVehicle);
    });
  });
  describe("tJSONString", () => {
    test("creates a JSON-string wrapped version of the given codec", () => {
      const tJSONUser = tJSONString(t.type({ id: t.number, name: t.string }, "User"));
      const good = '{"id": 9, "name": "dan"}';

      expectToDecodeWithAndEqual(good, tJSONUser, { id: 9, name: "dan" });

      const bad1 = '{"name": "dan"}';
      const bad2 = '{"id": 9}';
      const bad3 = '{"id": 9, "name": ["dan"]}';
      const bad4 = "9";
      expect(bad1).not.toDecodeWith(tJSONUser);
      expect(bad2).not.toDecodeWith(tJSONUser);
      expect(bad3).not.toDecodeWith(tJSONUser);
      expect(bad4).not.toDecodeWith(tJSONUser);

      const badDecoded = tJSONUser.decode(bad1);
      expect(isLeft(badDecoded)).toBe(true);
      if (isLeft(badDecoded)) {
        expect(PathReporter.report(badDecoded)[0]).toEqual(
          "Invalid value undefined supplied to : JSONString<User>/id: number"
        );
      }
    });
  });
});
