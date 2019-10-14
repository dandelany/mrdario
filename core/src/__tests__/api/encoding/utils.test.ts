import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { numEnumType, strEnumType, tJSONString } from "../../../utils/io";

describe("io-ts Utilities", () => {
  describe("strEnumType", () => {
    test("Creates codec for string enum", () => {
      enum Fruit {
        Apple = "ap",
        Orange = "or",
        Lemon = "le"
      }
      const tFruit = strEnumType<Fruit>(Fruit, "Fruit");

      const decodedOrange = tFruit.decode("or");
      expect(decodedOrange.isRight()).toBe(true);
      if (decodedOrange.isRight()) {
        expect(decodedOrange.value).toEqual("or");
        expect(decodedOrange.value).toEqual(Fruit.Orange);
      }

      const bad1 = tFruit.decode("Apple");
      expect(bad1.isRight()).toBe(false);

      const bad2 = tFruit.decode(9);
      expect(bad2.isRight()).toBe(false);

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

      const decodedCar = tVehicle.decode(Vehicle.Car);
      expect(decodedCar.isRight()).toBe(true);
      if (decodedCar.isRight()) {
        expect(decodedCar.value).toEqual(Vehicle.Car);
        expect(decodedCar.value).toEqual(1);
      }

      const bad1 = tVehicle.decode("Bike");
      expect(bad1.isRight()).toBe(false);

      const bad2 = tVehicle.decode(4);
      expect(bad2.isRight()).toBe(false);
    });
    test("Creates codec for numeric enum with specified numbers", () => {
      enum Vehicle {
        Bike = 2,
        Car = 4
      }
      const tVehicle = numEnumType<Vehicle>(Vehicle, "Vehicle");

      const decodedCar = tVehicle.decode(Vehicle.Car);
      expect(decodedCar.isRight()).toBe(true);
      if (decodedCar.isRight()) {
        expect(decodedCar.value).toEqual(Vehicle.Car);
        expect(decodedCar.value).toEqual(4);
      }

      const bad1 = tVehicle.decode("Bike");
      expect(bad1.isRight()).toBe(false);

      const bad2 = tVehicle.decode(0);
      expect(bad2.isRight()).toBe(false);
    });
  });
  describe("tJSONString", () => {
    test("creates a JSON-string wrapped version of the given codec", () => {
      const tJSONUser = tJSONString(t.type({ id: t.number, name: t.string }, "User"));
      const good = '{"id": 9, "name": "dan"}';
      const decoded = tJSONUser.decode(good);
      expect(decoded.isRight()).toBe(true);
      if (decoded.isRight()) {
        expect(decoded.value).toEqual({ id: 9, name: "dan" });
      }

      const bad1 = '{"name": "dan"}';
      const bad2 = '{"id": 9}';
      const bad3 = '{"id": 9, "name": ["dan"]}';
      const bad4 = "9";
      expect(tJSONUser.decode(bad1).isRight()).toBe(false);
      expect(tJSONUser.decode(bad2).isRight()).toBe(false);
      expect(tJSONUser.decode(bad3).isRight()).toBe(false);
      expect(tJSONUser.decode(bad4).isRight()).toBe(false);

      const badDecoded = tJSONUser.decode(bad1);
      expect(badDecoded.isLeft()).toBe(true);
      if (badDecoded.isLeft()) {
        expect(PathReporter.report(badDecoded)[0]).toEqual(
          "Invalid value undefined supplied to : JSONString<User>/id: number"
        );
      }
    });
  });
});
