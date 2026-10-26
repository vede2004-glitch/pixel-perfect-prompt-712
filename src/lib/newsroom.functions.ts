import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STUDIO_SOURCES, WINDOWS } from "./studio";
import { filterNewsroomNews } from "./newsroom-engine";

export const getNewsroomData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ selected_sources: z.array(z.string().refine((s) => STUDIO_SOURCES.includes(s))).max(STUDIO_SOURCES.length), time_window_hours: z.number().refine((h) => WINDOWS.some((v) => v === h)) }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "private, no-store");
    if (!data.selected_sources.length) return filterNewsroomNews([], [], data.time_window_hours);
    const { loadLiveNewsRaw, loadNewsroomFile } = await import("./news-source.server");
    const [live, memory, archive] = await Promise.all([loadLiveNewsRaw(), loadNewsroomFile("erdelyi_hirek_memoria.json"), loadNewsroomFile("erdelyi_hirek_archivum.json")]);
    const central = live ?? (await import("@/data/news.json")).default;
    const memoryData = memory ?? (await import("../../erdelyi_hirek_memoria.json")).default;
    const archiveData = archive ?? (await import("../../erdelyi_hirek_archivum.json")).default;
    return filterNewsroomNews([...central, ...memoryData, ...archiveData], data.selected_sources, data.time_window_hours);
  });