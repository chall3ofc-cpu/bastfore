// Slår upp en produkt via Open Food Facts (öppet API, ingen nyckel krävs).
export async function lookupProduct(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_sv,brands,quantity`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_sv?: string;
        brands?: string;
        quantity?: string;
      };
    };
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const base = (p.product_name_sv || p.product_name || "").trim();
    if (!base) return null;
    const brand = (p.brands || "").split(",")[0]?.trim();
    const qty = (p.quantity || "").trim();
    return [brand && !base.toLowerCase().includes(brand.toLowerCase()) ? brand : "", base, qty]
      .filter(Boolean)
      .join(" ")
      .trim();
  } catch {
    return null;
  }
}
