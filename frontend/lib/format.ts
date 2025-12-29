export function formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export function parseNumber(value: string): number {
    return Number(value.replace(/,/g, ""))
}
