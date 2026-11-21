import {
  normalize
} from "./shared-normalize.mjs";

export function matchMachines(
  borderMachines,
  chonboMachines
) {

  const map =
    new Map();

  for (
    const machine
    of chonboMachines
  ) {

    map.set(

      normalize(
        machine.name
      ),

      machine.url
    );
  }

  return borderMachines.map(
    machine => {

      const key =
        normalize(
          machine.name
        );

      let url = map.get(key);

if (!url) {

  for (const [name, value] of map) {

    if (
      name.includes(key) ||
      key.includes(name)
    ) {
      url = value;
      break;
    }
  }
}
        null;

      return {

        name:
          machine.name,

        chonboUrl:
          url,

        borders:
          machine.borders
      };
    }
  );
}
