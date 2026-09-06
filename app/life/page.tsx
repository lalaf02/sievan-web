import type { Metadata } from 'next';
import Link from 'next/link';
import { archive, counts, getClip, getVideo, pageOf } from '@/lib/data';
import { ClipTile, SheetTile } from '@/components/MediaTile';
import { LifeChapter, LifeChapters } from '@/components/LifeChapters';
import { Chronology } from '@/components/Chronology';
import styles from './life.module.css';

export const metadata: Metadata = {
  title: 'Life and Memory',
  description: 'Maurice Sievan (1898–1981): his life, work, memory, and surviving archival record.',
};

export default function LifePage() {
  const studio = pageOf('MS-AR-00027', 2);
  const rothko = pageOf('MS-AR-00029', 4);
  const portrait = getClip('painting-portrait');
  const outdoors = getClip('easel-demonstration');
  const testimony = archive.derived.undatedVideos
    .map((id) => getVideo(id))
    .filter((video): video is NonNullable<typeof video> => Boolean(video?.transcript_text_file))
    .map((video) => ({ id: video.id, title: video.title, href: `/life/interviews/${video.id}/`, words: video.transcript_word_count }));

  return (
    <div className="pageWide">
      <header className={styles.header}>
        <p className="eyebrow">1898–1981</p>
        <h1>Life and Memory</h1>
        <div className={styles.overview}>
          <p>Maurice Sievan was born in Ukraine, raised in Brooklyn, trained in New York and Paris, and painted for six decades.</p>
          <p>He moved from the city and suburbs toward recollection and abstraction without abandoning the figure.</p>
          <p>What follows brings his biography together with the photographs, footage, testimony, and records that survive.</p>
        </div>
      </header>

      <LifeChapters>
        <LifeChapter id="beginnings" title="Beginnings">
          <h2>Brooklyn, study, Paris</h2>
          {studio && <aside className={styles.marginMedia}>
            <SheetTile sheet={studio} aspect="4 / 3" href="/archive/objects/MS-AR-00027/"
              alt="Maurice Sievan seated by a window in his studio."
              caption="Sievan in the studio." meta="Albert Landry Gallery catalogue, 1963 · MS-AR-00027" />
          </aside>}
          <p>Sievan was drawing a weekly cartoon for the <em>Jewish Daily Forward</em> at fifteen while studying at Pratt Institute. He continued at the National Academy of Design, where Charles W. Hawthorne encouraged him to break through academic rules, and later at the Art Students League.</p>
          <p>In Paris he studied with André L’Hôte and exhibited at the Salon d’Automne in 1931. Returning to New York, he worked from a Greenwich Village studio and painted the urban landscape around him.</p>
        </LifeChapter>

        <LifeChapter id="city-and-suburbs" title="City and suburbs">
          <h2>The world close at hand</h2>
          {outdoors && <aside className={styles.marginMedia}><ClipTile clip={outdoors} caption="Sievan demonstrating at the easel. Silent, undated footage." /></aside>}
          <p>After moving to Flushing, Sievan found his subject in the ordinary suburban landscape. Joseph Solman, a founding member of The Ten alongside Rothko and Gottlieb, remembered that nobody had done the poetry of the suburbs as Sievan had.</p>
          <p>He was represented by galleries, reviewed by major critics, and acquired by museums, but he did not organize his work around the movements that increasingly determined attention in postwar New York. The imagery remained recognizably his own even as the prevailing language moved toward pure abstraction.</p>
        </LifeChapter>

        <LifeChapter id="memory" title="Painting from memory">
          <h2>Vision, memory, philosophy</h2>
          {portrait && <aside className={styles.marginMedia}><ClipTile clip={portrait} priority caption="Sievan working across the face of a portrait. Silent, undated footage." /></aside>}
          <p>A European trip in 1956 changed the work. After seeing landscape from the air, he stopped painting directly from observation and worked instead from recollection—what the retrospective catalogue called a meeting of vision, memory, and philosophy.</p>
          <p>The canvases grew larger and more abstract through the 1960s while retaining traces of figures and places. One entered the collection of the Museum of Modern Art, yet the work’s resistance to a single category and Sievan’s distance from the social machinery of the art world kept wider recognition limited.</p>
        </LifeChapter>

        <LifeChapter id="late-work" title="Late work and memory">
          <h2>The final years and the record</h2>
          {rothko && <aside className={styles.marginMedia}>
            <SheetTile sheet={rothko} aspect="3 / 4" href="/archive/objects/MS-AR-00029/"
              alt="Maurice Sievan in Mark Rothko's studio, Provincetown, 1961."
              caption="Sievan in Mark Rothko’s studio, Provincetown, 1961."
              meta="Photograph by Lee C. Sievan · MS-AR-00029" />
          </aside>}
          <p>In the 1970s he made what the retrospective catalogue describes as an extensive series of small, jewel-like paintings. He continued working until late in life and died in 1981.</p>
          <p>The surviving account is necessarily partial: exhibition records, the estate’s silent footage, photographs, and filmed recollections from people who knew him. Their testimony supplies texture without closing the gaps or turning memory into fact.</p>
        </LifeChapter>

        <LifeChapter id="chronology" title="Chronology">
          <h2>The dated record</h2>
          <p>Every event the archive can date is gathered here; gaps remain visible rather than being filled by inference.</p>
          <Chronology events={archive.derived.timeline} undatedTestimony={testimony}
            undatedAttestations={archive.derived.undatedAttestations.length} />
        </LifeChapter>
      </LifeChapters>

      <nav className={styles.pathways} aria-label="Continue exploring Sievan's life">
        <Link href="/life/retrospective/"><span>Primary document</span>The retrospective typescript</Link>
        <Link href="/life/interviews/"><span>Oral history</span>{counts.transcribedInterviews} filmed interviews</Link>
        <Link href="/people/"><span>People</span>{counts.persons} people in the archive</Link>
        <Link href="/places/"><span>Places</span>The studios, galleries, and collections</Link>
        <Link href="/exhibitions/"><span>Exhibitions</span>The documented exhibition record</Link>
      </nav>
    </div>
  );
}
