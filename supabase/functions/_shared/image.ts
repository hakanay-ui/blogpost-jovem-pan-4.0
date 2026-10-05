// Capas no formato do briefing: 1200×675 (16:9), WebP.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 675;

/** Recorta para 16:9 (preenchendo), redimensiona para 1200×675 e converte para WebP.
 *  Retorna null se a imagem não puder ser lida ou for pequena demais (ex.: logotipo). */
export async function toCoverWebp(
  bytes: Uint8Array,
  minSourceWidth = 0,
): Promise<{ bytes: Uint8Array; mime: string; ext: string } | null> {
  try {
    const img = await Image.decode(bytes);
    if (!(img instanceof Image)) return null; // GIF animado etc.
    if (img.width < minSourceWidth) return null;
    img.cover(COVER_WIDTH, COVER_HEIGHT);
    const webp = await img.encodeWEBP(80);
    return { bytes: webp, mime: "image/webp", ext: "webp" };
  } catch (e) {
    console.warn("[image] conversão para WebP falhou:", e instanceof Error ? e.message : e);
    return null;
  }
}
