// Helper function to clean up the address by removing "0x" if present
export const cleanAddress = (address: string): string => {
    return address.startsWith("0x") ? address.slice(2) : address;
};