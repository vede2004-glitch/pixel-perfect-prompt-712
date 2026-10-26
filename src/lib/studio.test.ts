import { describe, expect, it } from "bun:test";
import { hasSelection, prepareSearch, studioSearch, dashboardSchema } from "./studio";
describe("Studio selection rules", () => {
  it("hides the action bar without selected news", () => expect(hasSelection([])).toBe(false));
  it("shows the action bar once news is selected", () => expect(hasSelection(["news-1"])).toBe(true));
  it("preserves selected IDs for the preparation page", () => expect(prepareSearch({ids:"news-1|news-2"}).ids).toBe("news-1|news-2"));
  it("accepts the requested time windows", () => { for (const hours of [1,2,6,12,24]) expect(studioSearch({hours}).hours).toBe(hours); });
  it("keeps an explicitly empty source selection empty", () => expect(studioSearch({sources:""}).sources).toBe(""));
  it("validates engine arrays without mixing columns", () => { const result = dashboardSchema.parse({time_window_hours:6, selected_sources:["Maszol"], stats:{multi_source_count:1,single_source_count:1},multi_source_news:[{group_id:"multi",title_hu:"A",sources:[{source:"Maszol"},{source:"Transtelex"}]}],single_source_news:[{group_id:"single",title_hu:"B",source:"Maszol"}]}); expect(result.multi_source_news[0]?.group_id).toBe("multi"); expect(result.single_source_news[0]?.group_id).toBe("single"); });
});