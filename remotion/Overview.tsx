import type React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { compileTimeline } from "../src/timeline/compile.js";
import {
  formatCompactTime,
  summarizeTimelineMedia,
} from "../src/timeline/overview.js";
import { EpisodeComposition, type EpisodeProps } from "./Episode.js";
import { fileBasename, THEME } from "./theme.js";

/**
 * Vue cockpit « Vue d'ensemble » (1920×1080) dans Remotion Studio :
 * - Moniteur vidéo en direct + Inspecteur du plan actif (rush source, timecode rush, cadrage, texte)
 * - Chutier visuel de tous les rushs vidéo, B-rolls (vignettes) et chapitres utilisés
 * - Timeline multi-pistes horizontale (Chapitres, B-Rolls/Textes, 115 plans Rushs sur 1 seule ligne)
 * - Bandeau loupe des 5 plans autour de la tête de lecture.
 */
export const OverviewComposition: React.FC<EpisodeProps> = (props) => {
  const { timeline, episode } = props;
  const activeTimeline = episode !== undefined ? compileTimeline(episode) : timeline;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTime = frame / fps;
  const totalDuration = Math.max(1, activeTimeline.duration);
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  const mediaSummary = summarizeTimelineMedia(activeTimeline);

  const activeShotIndex = activeTimeline.shots.findIndex(
    (s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames,
  );
  const activeShot =
    activeShotIndex !== -1 ? activeTimeline.shots[activeShotIndex] : undefined;

  const activeChapter = activeTimeline.chapters.find(
    (c) => currentTime >= c.start && currentTime <= c.end,
  );
  const activeBroll = activeTimeline.brolls.find(
    (b) => frame >= b.startFrame && frame < b.startFrame + b.durationInFrames,
  );

  // Fenêtre de 5 plans autour du plan courant (ou du prochain plan)
  const centerIndex =
    activeShotIndex !== -1
      ? activeShotIndex
      : Math.max(
          0,
          activeTimeline.shots.findIndex((s) => s.start >= currentTime),
        );
  const windowStart = Math.max(
    0,
    Math.min(Math.max(0, activeTimeline.shots.length - 5), centerIndex - 1),
  );
  const neighborShots = activeTimeline.shots
    .slice(windowStart, windowStart + 5)
    .map((shot, idx) => ({ shot, index: windowStart + idx }));

  const monitorWidth = 768;
  const monitorHeight = 432;
  const monitorScale = monitorWidth / 1920;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#090d16",
        color: "#f8fafc",
        fontFamily: THEME.fonts.body,
        padding: 28,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}
    >
      {/* ZONE HAUTE : Moniteur + Inspecteur (Gauche) | Chutier Rushs & B-Rolls (Droite) */}
      <div style={{ display: "flex", gap: 22, height: 610 }}>
        {/* Colonne Gauche : Moniteur Live + Fiche du plan en cours */}
        <div
          style={{
            width: 804,
            backgroundColor: "#111827",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxSizing: "border-box",
          }}
        >
          {/* Moniteur 16:9 */}
          <div
            style={{
              width: monitorWidth,
              height: monitorHeight,
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              backgroundColor: "#000",
              border: "1px solid #334155",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 1920,
                height: 1080,
                transformOrigin: "0 0",
                transform: `scale(${monitorScale.toFixed(5)})`,
              }}
            >
              <EpisodeComposition {...props} timeline={activeTimeline} />
            </div>
            {/* Badge Timecode Montage en surimpression */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: "rgba(9, 13, 22, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.5)",
                borderRadius: 8,
                padding: "4px 10px",
                fontFamily: THEME.fonts.mono,
                fontSize: 15,
                fontWeight: 700,
                color: "#38bdf8",
              }}
            >
              Montage {formatCompactTime(currentTime, 1)} / {formatCompactTime(totalDuration)}
            </div>
          </div>

          {/* Inspecteur du plan actif */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#0f172a",
              borderRadius: 12,
              padding: "12px 16px",
              border: "1px solid #1e293b",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {activeShot !== undefined ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: "#1e293b",
                        color: "#38bdf8",
                        fontWeight: 800,
                        fontSize: 16,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      PLAN #{String(activeShotIndex + 1).padStart(3, "0")} /{" "}
                      {activeTimeline.shots.length}
                    </span>
                    <span
                      style={{
                        backgroundColor:
                          activeShot.framing === "serré" ? "#f59e0b" : "#0284c7",
                        color: "#090d16",
                        fontWeight: 900,
                        fontSize: 14,
                        padding: "4px 10px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      {activeShot.framing === "serré" ? "SERRÉ ×1.70" : "LARGE ×1.11"}
                    </span>
                    <span
                      style={{
                        color: "#e2e8f0",
                        fontFamily: THEME.fonts.mono,
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      🎥 {fileBasename(activeShot.file)}
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.14)",
                      border: "1px solid rgba(245, 158, 11, 0.45)",
                      color: "#fde68a",
                      fontFamily: THEME.fonts.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 6,
                    }}
                  >
                    TC Rush : {formatCompactTime(activeShot.trimBefore, 2)} →{" "}
                    {formatCompactTime(activeShot.trimAfter, 2)}
                  </div>
                </div>
                <div
                  style={{
                    color: "#f8fafc",
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  « {activeShot.words.map((w) => w.text).join(" ")} »
                </div>
              </>
            ) : activeChapter !== undefined ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    backgroundColor: "#a855f7",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 15,
                    padding: "5px 12px",
                    borderRadius: 6,
                  }}
                >
                  CARTE CHAPITRE {activeChapter.chapterIndex}
                </span>
                <span style={{ fontSize: 22, fontWeight: 800 }}>
                  {activeChapter.title}
                </span>
              </div>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 16 }}>
                Transition / Hors plan de parole
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite : Chutier des Rushs, B-Rolls et Chapitres */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#111827",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxSizing: "border-box",
          }}
        >
          {/* En-tête Chutier : Rushs vidéo utilisés */}
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#94a3b8",
                marginBottom: 8,
              }}
            >
              🎬 Rushs vidéo sources utilisés ({mediaSummary.rushes.length} fichier
              {mediaSummary.rushes.length > 1 ? "s" : ""} · {mediaSummary.totalShots} plans retenus)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {mediaSummary.rushes.map((rush) => (
                <div
                  key={rush.file}
                  style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #38bdf8",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 18,
                    flex: "1 1 420px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: THEME.fonts.mono,
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#f8fafc",
                      }}
                    >
                      {fileBasename(rush.file)}
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                      Durée montée retenue : {formatCompactTime(rush.totalDuration)} ·{" "}
                      {rush.shotCount} coupes franches
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: "rgba(2, 132, 199, 0.22)",
                        border: "1px solid #0284c7",
                        color: "#38bdf8",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {rush.largeCount} Large
                    </span>
                    <span
                      style={{
                        backgroundColor: "rgba(245, 158, 11, 0.2)",
                        border: "1px solid #f59e0b",
                        color: "#fbbf24",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {rush.serreCount} Serré
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grille visuelle des B-Rolls utilisés */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#94a3b8",
                marginBottom: 8,
              }}
            >
              🖼️ Chutier B-Rolls ({mediaSummary.brolls.length} médias ·{" "}
              {activeTimeline.brolls.length} apparitions) & Textes ({activeTimeline.texts.length})
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 10,
                flex: 1,
              }}
            >
              {mediaSummary.brolls.slice(0, 10).map((broll) => {
                const isActive = activeBroll?.asset === broll.asset;
                const isPast = broll.occurrences.every((o) => o.end < currentTime);
                return (
                  <div
                    key={broll.asset}
                    style={{
                      backgroundColor: "#0f172a",
                      borderRadius: 10,
                      border: isActive
                        ? "2px solid #38bdf8"
                        : "1px solid #1e293b",
                      boxShadow: isActive
                        ? "0 0 18px rgba(56, 189, 248, 0.45)"
                        : "none",
                      opacity: isPast && !isActive ? 0.62 : 1,
                      padding: 6,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: 78,
                        borderRadius: 6,
                        overflow: "hidden",
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!broll.isVideo ? (
                        <Img
                          src={staticFile(`rushs/${fileBasename(broll.asset)}`)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>
                          VIDÉO
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isActive ? "#38bdf8" : "#e2e8f0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {fileBasename(broll.asset)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: THEME.fonts.mono,
                          color: "#94a3b8",
                        }}
                      >
                        {broll.occurrences
                          .map((o) => formatCompactTime(o.start))
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chapitres de l'épisode */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#94a3b8",
                marginBottom: 6,
              }}
            >
              📑 Chapitres ({activeTimeline.chapters.length})
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {activeTimeline.chapters.map((ch, idx) => {
                const nextCh = activeTimeline.chapters[idx + 1];
                const chEnd = nextCh !== undefined ? nextCh.start : totalDuration;
                const isCurrentSection = currentTime >= ch.start && currentTime < chEnd;
                return (
                  <div
                    key={`ch-pill-${ch.chapterIndex}-${ch.start}`}
                    style={{
                      flex: 1,
                      backgroundColor: isCurrentSection
                        ? "rgba(168, 85, 247, 0.22)"
                        : "#0f172a",
                      border: isCurrentSection
                        ? "1px solid #a855f7"
                        : "1px solid #1e293b",
                      borderRadius: 8,
                      padding: "6px 10px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#c084fc",
                        fontFamily: THEME.fonts.mono,
                      }}
                    >
                      CH.{ch.chapterIndex} · {formatCompactTime(ch.start)}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f8fafc",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ch.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ZONE BASSE : Timeline Multi-Pistes Horizontale sur 1 écran + Loupe 5 plans */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#111827",
          borderRadius: 18,
          padding: "16px 20px",
          border: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Pistes horizontales (0:00 -> fin) */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Ligne 1 : Chapitres */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 24 }}>
            <div style={{ width: 130, fontSize: 12, fontWeight: 800, color: "#c084fc" }}>
              📑 CHAPITRES
            </div>
            <div
              style={{
                flex: 1,
                height: "100%",
                backgroundColor: "#0f172a",
                borderRadius: 6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {activeTimeline.chapters.map((ch, idx) => {
                const nextCh = activeTimeline.chapters[idx + 1];
                const sectionEnd = nextCh !== undefined ? nextCh.start : totalDuration;
                const leftPct = (ch.start / totalDuration) * 100;
                const widthPct = Math.max(0.5, ((sectionEnd - ch.start) / totalDuration) * 100);
                return (
                  <div
                    key={`tl-ch-${ch.chapterIndex}-${ch.start}`}
                    style={{
                      position: "absolute",
                      left: `${leftPct.toFixed(3)}%`,
                      width: `${widthPct.toFixed(3)}%`,
                      top: 2,
                      bottom: 2,
                      backgroundColor: "rgba(168, 85, 247, 0.32)",
                      borderLeft: "2px solid #c084fc",
                      paddingLeft: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#f3e8ff",
                      display: "flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {ch.chapterIndex}. {ch.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ligne 2 : B-Rolls & Textes */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 24 }}>
            <div style={{ width: 130, fontSize: 12, fontWeight: 800, color: "#34d399" }}>
              🖼️ HABILLAGE
            </div>
            <div
              style={{
                flex: 1,
                height: "100%",
                backgroundColor: "#0f172a",
                borderRadius: 6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {activeTimeline.brolls.map((b, idx) => {
                const leftPct = (b.start / totalDuration) * 100;
                const widthPct = Math.max(0.4, ((b.end - b.start) / totalDuration) * 100);
                return (
                  <div
                    key={`tl-broll-${idx}-${b.start}`}
                    style={{
                      position: "absolute",
                      left: `${leftPct.toFixed(3)}%`,
                      width: `${widthPct.toFixed(3)}%`,
                      top: 2,
                      bottom: 2,
                      backgroundColor: "#10b981",
                      borderRadius: 3,
                    }}
                  />
                );
              })}
              {activeTimeline.texts.map((t, idx) => {
                const leftPct = (t.start / totalDuration) * 100;
                const widthPct = Math.max(0.4, ((t.end - t.start) / totalDuration) * 100);
                return (
                  <div
                    key={`tl-text-${idx}-${t.start}`}
                    style={{
                      position: "absolute",
                      left: `${leftPct.toFixed(3)}%`,
                      width: `${widthPct.toFixed(3)}%`,
                      top: 2,
                      bottom: 2,
                      backgroundColor: "#ec4899",
                      borderRadius: 3,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Ligne 3 : Tous les plans Rushs sur UNE SEULE ligne (Bleu = Large, Ambre = Serré) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 34 }}>
            <div style={{ width: 130, fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
              🎬 RUSHS ({activeTimeline.shots.length})
            </div>
            <div
              style={{
                flex: 1,
                height: "100%",
                backgroundColor: "#0f172a",
                borderRadius: 6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {activeTimeline.shots.map((shot, idx) => {
                const leftPct = (shot.start / totalDuration) * 100;
                const widthPct = Math.max(0.15, ((shot.end - shot.start) / totalDuration) * 100);
                const isCurrent = idx === activeShotIndex;
                return (
                  <div
                    key={`tl-shot-${idx}-${shot.start}`}
                    style={{
                      position: "absolute",
                      left: `${leftPct.toFixed(3)}%`,
                      width: `${widthPct.toFixed(3)}%`,
                      top: isCurrent ? 0 : 3,
                      bottom: isCurrent ? 0 : 3,
                      backgroundColor:
                        shot.framing === "serré" ? "#f59e0b" : "#0284c7",
                      borderRight: "1px solid #090d16",
                      boxSizing: "border-box",
                      opacity: isCurrent ? 1 : 0.85,
                    }}
                  />
                );
              })}

              {/* Curseur de lecture vertical sur la piste */}
              <div
                style={{
                  position: "absolute",
                  left: `${playheadPercent.toFixed(3)}%`,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  backgroundColor: "#ef4444",
                  boxShadow: "0 0 10px #ef4444",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bandeau Loupe : les 5 plans autour du curseur */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            flex: 1,
          }}
        >
          {neighborShots.map(({ shot, index }) => {
            const isCurrent = index === activeShotIndex;
            const shotBroll = activeTimeline.brolls.find(
              (b) => Math.abs(b.start - shot.start) < 0.05,
            );
            const shotText = activeTimeline.texts.find(
              (t) => Math.abs(t.start - shot.start) < 0.05,
            );

            return (
              <div
                key={`zoom-shot-${index}-${shot.start}`}
                style={{
                  backgroundColor: isCurrent ? "rgba(14, 165, 233, 0.16)" : "#0f172a",
                  border: isCurrent ? "2px solid #38bdf8" : "1px solid #1e293b",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isCurrent ? "#38bdf8" : "#94a3b8",
                    }}
                  >
                    #{String(index + 1).padStart(3, "0")} ·{" "}
                    {shot.framing.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: THEME.fonts.mono,
                      color: "#fde68a",
                    }}
                  >
                    Rush {formatCompactTime(shot.trimBefore)}→
                    {formatCompactTime(shot.trimAfter)}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#f8fafc",
                    fontWeight: isCurrent ? 700 : 500,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {shot.words.map((w) => w.text).join(" ")}
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: THEME.fonts.mono,
                      color: "#64748b",
                    }}
                  >
                    Montage {formatCompactTime(shot.start)}
                  </span>
                  {shotBroll !== undefined ? (
                    <span
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.2)",
                        color: "#34d399",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      🖼️ {fileBasename(shotBroll.asset)}
                    </span>
                  ) : null}
                  {shotText !== undefined ? (
                    <span
                      style={{
                        backgroundColor: "rgba(236, 72, 153, 0.2)",
                        color: "#f472b6",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      🏷️ Texte
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
