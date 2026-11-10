import heroBorder from "@/assets/stirix-border-crossing.jpg";
import heroBulvar from "@/assets/stirix-bulvar.jpg";
import heroGazdasag from "@/assets/stirix-gazdasag.jpg";
import heroHarghita from "@/assets/stirix-harghita.jpg";
import heroHospital from "@/assets/stirix-hospital.jpg";
import heroKultura from "@/assets/stirix-kultura.jpg";
import heroSport from "@/assets/stirix-sport.jpg";
import heroEu from "@/assets/stirix-eu.jpg";
import heroRoParliament from "@/assets/stirix-ro-parliament.jpg";
import heroHuParliament from "@/assets/stirix-hu-parliament.jpg";
import heroJustice from "@/assets/stirix-justice.jpg";
import heroEducation from "@/assets/stirix-education.jpg";
import heroCluj from "@/assets/stirix-cluj.jpg";
import { selectArticlePhoto } from "./hero-photo-selection";

// Gallery photos are real files under public/gallery so external hosts (Vercel, Cloudflare) serve them;
// pointer metadata only supplies the file name and category.
const gallery = Object.entries(import.meta.glob<{ url: string }>("../assets/gallery/**/*.asset.json", { eager: true, import: "default" }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, asset]): [string, { url: string }] => {
    const category = path.split("/gallery/")[1].split("/")[0];
    const file = asset.url.split("/").pop();
    return [path, { url: `/gallery/${category}/${file}` }];
  });
const photos = (category: string, name?: RegExp) => gallery
  .filter(([path]) => path.includes(`/gallery/${category}/`) && (!name || name.test(path)))
  .map(([, asset]) => asset.url);

const categories: Record<string, string[]> = {
  "Politika": [heroBorder, ...photos("politika", /podium|panel-microphones/)],
  "Erdély": [heroHarghita, ...photos("erdely")],
  "Sport": [heroSport, ...photos("sport")],
  "Kultúra": [heroKultura, ...photos("kultura")],
  "Gazdaság": [heroGazdasag, ...photos("altalanos", /business-news|tablet-coffee/)],
  "Bulvár": [heroBulvar, ...photos("bulvar")],
  "Általános": [heroCluj, ...photos("altalanos")],
};
// Specific places and sports take priority over broad category imagery.
const topics: Array<[RegExp, string[]]> = [
  [/\b(EU|európai unió|európai bizottság|brüsszel|uniós|uniunea europeană|comisia europeană|bruxelles|ue)\b/i, [heroEu, ...photos("politika", /european-parliament/)]],
  [/(román (kormány|parlament|szenátus|miniszter|elnök)|romániai (kormány|parlament)|bukarest|bolojan|nicușor|guvernul|parlamentul|senatul|camera deputa|bucurești)/i, [heroRoParliament, ...photos("politika", /palace-of-the-parliament/)]],
  [/(országgyűlés|budapest|orbán|magyar kormány|magyarországi (kormány|parlament)|guvernul ungar|budapesta)/i, [heroHuParliament]],
  [/(bíróság|ítélet|ügyész|rendőr|\bdna\b|instanț|procuror|poliți|tribunal)/i, [heroJustice]],
  [/(iskola|oktatás|érettségi|egyetem|școal|educați|universit|bacalaureat)/i, [heroEducation]],
  [/(kórház|egészség|orvos|beteg|spital|sănătat|medic|pacient)/i, [heroHospital]],
  [/(kolozsvár|cluj)/i, [heroCluj]],
  [/(kosárlabda|baschet|basketball)/i, photos("sport", /basketball/)],
  [/(amerikai futball|fotbal american)/i, photos("sport", /american-football/)],
  [/(foci|labdarúg|futball|fotbal|soccer)/i, photos("sport", /soccer|goal-post|people-playing/)],
  [/(könyv|könyvtár|irodalo|bibliotec|literatur|carte|cărți)/i, photos("kultura", /library/)],
  [/(színház|opera|teatru|operă)/i, photos("kultura", /opera-house|theater/)],
  [/(koncert|fesztivál|concert|festival)/i, [...photos("bulvar", /crowd|audience/), ...photos("kultura", /stage-lighting|blue-lights/)]],
];

export function heroPhoto(category: string, text: string, articleId: string): string {
  const pool = topics.find(([pattern, images]) => images.length && pattern.test(text))?.[1]
    ?? categories[category] ?? categories["Általános"] ?? [heroCluj];
  return selectArticlePhoto(pool, articleId) ?? heroCluj;
}