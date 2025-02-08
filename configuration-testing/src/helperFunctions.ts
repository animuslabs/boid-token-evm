// Helper function to clean up the address by removing "0x" if present
export const cleanAddress = (address: string): string => {
    return address.startsWith("0x") ? address.slice(2) : address;
};

export function toObject(data:Record<string, any>):Record<string, any> {
    return JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === "bigint"
        ? value.toString()
        : value // return everything else unchanged
    ))
  }