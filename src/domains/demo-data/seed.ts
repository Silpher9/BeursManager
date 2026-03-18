import { fal } from '@fal-ai/client';
import { type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { saveContact } from '@/src/domains/contacts/repository';
import { createExpenseForFair } from '@/src/domains/expenses/repository';
import { saveFair, setFairArtworkIncluded } from '@/src/domains/fairs/repository';
import { persistArtworkPhotoAssetsAsync } from '@/src/domains/inventory/artworkStorage';
import { listArtworks, saveArtwork } from '@/src/domains/inventory/repository';
import { type ArtworkStatus } from '@/src/domains/inventory/types';
import { createSaleForFair } from '@/src/domains/sales/repository';
import { dateToLocalIso } from '@/src/shared/date';

type DemoArtworkPreset = {
  key: string;
  title: string;
  artistName: string;
  technique: string;
  year: string;
  series: string;
  status: ArtworkStatus;
  askingPrice: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
  prompt: string;
};

type DemoFairPreset = {
  key: 'past' | 'active' | 'upcoming';
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type SeedDemoDataOptions = {
  falKey?: string | null;
  onProgress?: (message: string) => void;
};

export type SeedDemoDataResult = {
  artworkCount: number;
  artistCount: number;
  fairCount: number;
  contactCount: number;
  usedFalImages: boolean;
};

type DemoCatalogSummary = {
  artworkCount: number;
  artistCount: number;
  fairCount: number;
};

const demoArtworks: DemoArtworkPreset[] = [
  {
    key: 'morgenlicht',
    title: 'Morgenlicht',
    artistName: 'Eva de Winter',
    technique: 'Acryl op doek',
    year: '2024',
    series: 'Lichtval',
    status: 'beschikbaar',
    askingPrice: '1450',
    heightCm: '90',
    widthCm: '70',
    depthCm: '2',
    prompt:
      'gallery wall presentation of a contemporary abstract acrylic painting with soft peach, sand and ultramarine color fields, photographed frontally in neutral daylight',
  },
  {
    key: 'stille_stroom',
    title: 'Stille stroom',
    artistName: 'Eva de Winter',
    technique: 'Gemengde techniek',
    year: '2025',
    series: 'Getijden',
    status: 'op_beurs',
    askingPrice: '1850',
    heightCm: '110',
    widthCm: '90',
    depthCm: '3',
    prompt:
      'front-facing artwork photo of a mixed media abstract painting with layered blue and rust textures, refined contemporary gallery aesthetic, clean wall background',
  },
  {
    key: 'schemering_ii',
    title: 'Schemering II',
    artistName: 'Eva de Winter',
    technique: 'Acryl op doek',
    year: '2021',
    series: 'Lichtval',
    status: 'beschikbaar',
    askingPrice: '1180',
    heightCm: '70',
    widthCm: '60',
    depthCm: '2',
    prompt:
      'contemporary abstract painting photograph with layered dusk colors, mauve and indigo gradients, crisp frontal documentation shot',
  },
  {
    key: 'veldnotitie',
    title: 'Veldnotitie',
    artistName: 'Eva de Winter',
    technique: 'Acryl en pastel',
    year: '2023',
    series: 'Lichtval',
    status: 'beschikbaar',
    askingPrice: '1260',
    heightCm: '75',
    widthCm: '65',
    depthCm: '2',
    prompt:
      'frontal photograph of a contemporary abstract painting with layered pastel strokes in sage, cream and slate blue, calm gallery presentation',
  },
  {
    key: 'noordzee_in_blauw',
    title: 'Noordzee in blauw',
    artistName: 'Eva de Winter',
    technique: 'Acryl op doek',
    year: '2025',
    series: 'Getijden',
    status: 'gereserveerd',
    askingPrice: '1940',
    heightCm: '100',
    widthCm: '80',
    depthCm: '3',
    prompt:
      'gallery documentation photo of a contemporary abstract seascape-inspired painting with blue layers, chalk whites and subtle horizon bands',
  },
  {
    key: 'zomerlijn',
    title: 'Zomerlijn',
    artistName: 'Eva de Winter',
    technique: 'Acryl op linnen',
    year: '2022',
    series: 'Lichtval',
    status: 'ingepakt',
    askingPrice: '980',
    heightCm: '60',
    widthCm: '50',
    depthCm: '2',
    prompt:
      'clean front-facing artwork shot of a warm minimalist abstract painting with apricot and stone color blocking, gentle museum lighting',
  },
  {
    key: 'lichtkamer',
    title: 'Lichtkamer',
    artistName: 'Eva de Winter',
    technique: 'Gemengde techniek',
    year: '2024',
    series: 'Binnenlicht',
    status: 'beschikbaar',
    askingPrice: '1725',
    heightCm: '95',
    widthCm: '85',
    depthCm: '3',
    prompt:
      'high quality gallery photo of an abstract mixed media painting with luminous interior glow, pale blush, grey and ultramarine accents',
  },
  {
    key: 'getijdenruit',
    title: 'Getijdenruit',
    artistName: 'Eva de Winter',
    technique: 'Acryl en krijt',
    year: '2026',
    series: 'Getijden',
    status: 'op_beurs',
    askingPrice: '2080',
    heightCm: '120',
    widthCm: '95',
    depthCm: '3',
    prompt:
      'front-on photo of a large abstract painting with layered tidal geometry, pale sand, cobalt and rust, contemporary white wall setting',
  },
  {
    key: 'ochtendnevel',
    title: 'Ochtendnevel',
    artistName: 'Eva de Winter',
    technique: 'Acryl op doek',
    year: '2023',
    series: 'Lichtval',
    status: 'beschikbaar',
    askingPrice: '1320',
    heightCm: '80',
    widthCm: '65',
    depthCm: '2',
    prompt:
      'frontal gallery photo of a contemporary abstract acrylic painting with soft misty morning palette, pale rose, dove grey and cream color fields, delicate layered brushwork',
  },
  {
    key: 'eb_en_kalk',
    title: 'Eb en kalk',
    artistName: 'Eva de Winter',
    technique: 'Gemengde techniek',
    year: '2025',
    series: 'Getijden',
    status: 'beschikbaar',
    askingPrice: '1590',
    heightCm: '105',
    widthCm: '85',
    depthCm: '3',
    prompt:
      'front-facing artwork photo of a mixed media abstract painting with chalky white textures, tidal sand marks and subtle aquamarine washes, contemporary gallery wall',
  },
  {
    key: 'stad_in_relief',
    title: 'Stad in relief',
    artistName: 'Jonas Vermeer',
    technique: 'Structuurpasta en pigment',
    year: '2023',
    series: 'Stadsrand',
    status: 'ingepakt',
    askingPrice: '2100',
    heightCm: '100',
    widthCm: '80',
    depthCm: '4',
    prompt:
      'high quality studio photo of a contemporary textured painting with geometric urban relief forms in warm grey, black and copper tones, centered composition',
  },
  {
    key: 'zinderlijn',
    title: 'Zinderlijn',
    artistName: 'Jonas Vermeer',
    technique: 'Acryl en houtskool',
    year: '2025',
    series: 'Horizonnen',
    status: 'gereserveerd',
    askingPrice: '1325',
    heightCm: '80',
    widthCm: '80',
    depthCm: '2',
    prompt:
      'square contemporary abstract artwork photo with energetic charcoal lines and ochre accents, minimalist gallery lighting, frontal capture',
  },
  {
    key: 'betonwind',
    title: 'Betonwind',
    artistName: 'Jonas Vermeer',
    technique: 'Acryl, zand en pigment',
    year: '2025',
    series: 'Stadsrand',
    status: 'ingepakt',
    askingPrice: '2400',
    heightCm: '120',
    widthCm: '100',
    depthCm: '4',
    prompt:
      'museum quality frontal photo of a large contemporary abstract painting with concrete textures and wind-swept strokes, restrained palette, white gallery wall',
  },
  {
    key: 'lijn_van_staal',
    title: 'Lijn van staal',
    artistName: 'Jonas Vermeer',
    technique: 'Houtskool en pigment',
    year: '2024',
    series: 'Horizonnen',
    status: 'beschikbaar',
    askingPrice: '1540',
    heightCm: '85',
    widthCm: '70',
    depthCm: '2',
    prompt:
      'frontal artwork image of a contemporary abstract painting with steel-like grey bands, charcoal gestures and copper accents, crisp neutral lighting',
  },
  {
    key: 'viaduct',
    title: 'Viaduct',
    artistName: 'Jonas Vermeer',
    technique: 'Structuurpasta en acryl',
    year: '2022',
    series: 'Stadsrand',
    status: 'beschikbaar',
    askingPrice: '1760',
    heightCm: '90',
    widthCm: '90',
    depthCm: '3',
    prompt:
      'gallery presentation photo of an urban abstract textured painting inspired by bridge forms, warm concrete palette and centered composition',
  },
  {
    key: 'nachtspoor',
    title: 'Nachtspoor',
    artistName: 'Jonas Vermeer',
    technique: 'Acryl en krijt',
    year: '2026',
    series: 'Horizonnen',
    status: 'op_beurs',
    askingPrice: '1880',
    heightCm: '95',
    widthCm: '75',
    depthCm: '2',
    prompt:
      'front-facing contemporary painting photo with dark graphite tones, electric amber line work and urban night energy, clean wall background',
  },
  {
    key: 'randgebied',
    title: 'Randgebied',
    artistName: 'Jonas Vermeer',
    technique: 'Pigment en zand',
    year: '2023',
    series: 'Stadsrand',
    status: 'beschikbaar',
    askingPrice: '1675',
    heightCm: '88',
    widthCm: '68',
    depthCm: '3',
    prompt:
      'detailed photograph of a contemporary abstract textured painting with sandy surfaces and muted copper-grey palette, shown frontally',
  },
  {
    key: 'schaduwstraat',
    title: 'Schaduwstraat',
    artistName: 'Jonas Vermeer',
    technique: 'Acryl en houtskool',
    year: '2024',
    series: 'Stadsrand',
    status: 'gereserveerd',
    askingPrice: '1595',
    heightCm: '82',
    widthCm: '64',
    depthCm: '2',
    prompt:
      'clean frontal artwork photo of an abstract urban painting with shadowed street geometry, charcoal black and warm rust highlights',
  },
  {
    key: 'ijzergloed',
    title: 'IJzergloed',
    artistName: 'Jonas Vermeer',
    technique: 'Pigment en ijzeroxide',
    year: '2025',
    series: 'Stadsrand',
    status: 'beschikbaar',
    askingPrice: '1720',
    heightCm: '92',
    widthCm: '72',
    depthCm: '4',
    prompt:
      'high quality gallery photo of a contemporary textured abstract painting with iron oxide rust surfaces, deep burnt orange and raw umber, industrial materiality, frontal white wall',
  },
  {
    key: 'spoortunnel',
    title: 'Spoortunnel',
    artistName: 'Jonas Vermeer',
    technique: 'Acryl en houtskool',
    year: '2024',
    series: 'Horizonnen',
    status: 'ingepakt',
    askingPrice: '1450',
    heightCm: '78',
    widthCm: '78',
    depthCm: '2',
    prompt:
      'frontal artwork image of a contemporary abstract painting with dark tunnel perspective, charcoal black graduating to grey, a single amber light point, minimalist gallery setting',
  },
  {
    key: 'atelier_noord',
    title: 'Atelier Noord',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op paneel',
    year: '2022',
    series: 'Stille plekken',
    status: 'beschikbaar',
    askingPrice: '980',
    heightCm: '60',
    widthCm: '50',
    depthCm: '2',
    prompt:
      'frontal studio photograph of a figurative oil painting showing a quiet atelier corner with muted green and cream palette, realistic but painterly',
  },
  {
    key: 'kaslicht',
    title: 'Kaslicht',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2024',
    series: 'Stille plekken',
    status: 'op_beurs',
    askingPrice: '1650',
    heightCm: '95',
    widthCm: '75',
    depthCm: '2',
    prompt:
      'gallery style photograph of a figurative oil painting with greenhouse interior, luminous greens and warm window light, front-on neutral background',
  },
  {
    key: 'binnenkamer',
    title: 'Binnenkamer',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2023',
    series: 'Interieurs',
    status: 'beschikbaar',
    askingPrice: '1420',
    heightCm: '78',
    widthCm: '64',
    depthCm: '2',
    prompt:
      'front-facing photo of a figurative interior oil painting with a quiet room, pale terracotta and moss green palette, refined gallery documentation',
  },
  {
    key: 'raam_in_regen',
    title: 'Raam in regen',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op paneel',
    year: '2025',
    series: 'Interieurs',
    status: 'gereserveerd',
    askingPrice: '1190',
    heightCm: '58',
    widthCm: '48',
    depthCm: '2',
    prompt:
      'studio artwork photo of a figurative oil painting showing a rainy window with soft reflections and muted blue-grey light, frontal crop',
  },
  {
    key: 'stille_tafel',
    title: 'Stille tafel',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2021',
    series: 'Stille plekken',
    status: 'ingepakt',
    askingPrice: '1095',
    heightCm: '65',
    widthCm: '55',
    depthCm: '2',
    prompt:
      'clear front-on painting documentation shot of a figurative still-life table scene with muted ceramics and warm afternoon light',
  },
  {
    key: 'overgroeid_pad',
    title: 'Overgroeid pad',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2026',
    series: 'Buitenstudies',
    status: 'beschikbaar',
    askingPrice: '1360',
    heightCm: '72',
    widthCm: '62',
    depthCm: '2',
    prompt:
      'gallery photograph of a figurative oil painting with an overgrown garden path, lush greens and creamy light, photographed frontally',
  },
  {
    key: 'avondatelier',
    title: 'Avondatelier',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op paneel',
    year: '2024',
    series: 'Interieurs',
    status: 'op_beurs',
    askingPrice: '1510',
    heightCm: '80',
    widthCm: '60',
    depthCm: '2',
    prompt:
      'front-facing artwork image of a figurative atelier scene at dusk with lamp glow, soft sienna and deep green tones, museum style documentation',
  },
  {
    key: 'ochtendritueel',
    title: 'Ochtendritueel',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2024',
    series: 'Interieurs',
    status: 'beschikbaar',
    askingPrice: '1280',
    heightCm: '70',
    widthCm: '56',
    depthCm: '2',
    prompt:
      'frontal gallery photograph of a figurative oil painting showing a quiet morning kitchen scene with coffee cup and window light, muted ochre and warm grey palette, painterly realism',
  },
  {
    key: 'tuinhek',
    title: 'Tuinhek',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op paneel',
    year: '2023',
    series: 'Buitenstudies',
    status: 'beschikbaar',
    askingPrice: '1145',
    heightCm: '55',
    widthCm: '45',
    depthCm: '2',
    prompt:
      'clean front-on painting documentation of a figurative oil painting showing an old wooden garden gate with climbing roses, soft green and weathered blue palette, painterly style',
  },
  {
    key: 'leeslamp',
    title: 'Leeslamp',
    artistName: 'Noor van Loon',
    technique: 'Olieverf op doek',
    year: '2025',
    series: 'Stille plekken',
    status: 'op_beurs',
    askingPrice: '1390',
    heightCm: '76',
    widthCm: '62',
    depthCm: '2',
    prompt:
      'gallery style photograph of a figurative oil painting with a reading lamp casting warm amber light over an armchair and book, intimate domestic scene, soft sienna and deep green',
  },
  {
    key: 'papieren_getij',
    title: 'Papieren getij',
    artistName: 'Mila Hartman',
    technique: 'Collage op paneel',
    year: '2025',
    series: 'Atlas',
    status: 'beschikbaar',
    askingPrice: '1280',
    heightCm: '70',
    widthCm: '50',
    depthCm: '3',
    prompt:
      'frontal artwork photo of a contemporary paper collage with layered coastal maps, ivory, ink blue and sand tones, elegant gallery wall',
  },
  {
    key: 'koperregen',
    title: 'Koperregen',
    artistName: 'Mila Hartman',
    technique: 'Gemengde techniek',
    year: '2024',
    series: 'Fragmenten',
    status: 'beschikbaar',
    askingPrice: '1390',
    heightCm: '82',
    widthCm: '62',
    depthCm: '3',
    prompt:
      'clean frontal photo of a contemporary mixed media collage with copper leaf fragments, cream paper textures and dark ink gestures',
  },
  {
    key: 'atlas_van_stof',
    title: 'Atlas van stof',
    artistName: 'Mila Hartman',
    technique: 'Textielcollage',
    year: '2023',
    series: 'Atlas',
    status: 'gereserveerd',
    askingPrice: '1495',
    heightCm: '90',
    widthCm: '70',
    depthCm: '4',
    prompt:
      'high quality gallery documentation image of a textile collage artwork with stitched map-like fragments, parchment palette and soft shadows',
  },
  {
    key: 'schemeratlas',
    title: 'Schemeratlas',
    artistName: 'Mila Hartman',
    technique: 'Collage en pigment',
    year: '2026',
    series: 'Atlas',
    status: 'op_beurs',
    askingPrice: '1710',
    heightCm: '96',
    widthCm: '76',
    depthCm: '3',
    prompt:
      'front-facing image of a contemporary collage artwork with twilight blue paper layers, map fragments and refined gallery presentation',
  },
  {
    key: 'ritme_van_stof',
    title: 'Ritme van stof',
    artistName: 'Mila Hartman',
    technique: 'Textiel en gouache',
    year: '2022',
    series: 'Fragmenten',
    status: 'ingepakt',
    askingPrice: '1175',
    heightCm: '68',
    widthCm: '58',
    depthCm: '3',
    prompt:
      'museum style frontal photo of a contemporary textile artwork with rhythmic stitched forms, chalk white, umber and faded blue palette',
  },
  {
    key: 'snijlicht',
    title: 'Snijlicht',
    artistName: 'Mila Hartman',
    technique: 'Papiercollage',
    year: '2025',
    series: 'Fragmenten',
    status: 'beschikbaar',
    askingPrice: '1235',
    heightCm: '74',
    widthCm: '54',
    depthCm: '3',
    prompt:
      'frontal gallery photograph of a paper collage artwork with cut angular light forms, warm off-white background and graphite marks',
  },
  {
    key: 'tijdbalk',
    title: 'Tijdbalk',
    artistName: 'Mila Hartman',
    technique: 'Collage op doek',
    year: '2024',
    series: 'Atlas',
    status: 'op_beurs',
    askingPrice: '1580',
    heightCm: '100',
    widthCm: '80',
    depthCm: '3',
    prompt:
      'front-on photo of a contemporary collage painting with horizontal timeline structure, layered paper bands and muted terracotta-blue palette',
  },
  {
    key: 'vezelgeheugen',
    title: 'Vezelgeheugen',
    artistName: 'Mila Hartman',
    technique: 'Textielcollage',
    year: '2023',
    series: 'Fragmenten',
    status: 'beschikbaar',
    askingPrice: '1340',
    heightCm: '78',
    widthCm: '58',
    depthCm: '4',
    prompt:
      'museum style frontal photo of a contemporary textile collage artwork with woven fiber fragments, natural linen textures, cream, terracotta and indigo accents, clean gallery wall',
  },
  {
    key: 'kaartlaag_iii',
    title: 'Kaartlaag III',
    artistName: 'Mila Hartman',
    technique: 'Collage op paneel',
    year: '2025',
    series: 'Atlas',
    status: 'beschikbaar',
    askingPrice: '1425',
    heightCm: '86',
    widthCm: '66',
    depthCm: '3',
    prompt:
      'frontal gallery photograph of a contemporary collage artwork with layered vintage map fragments, translucent paper overlaps, sepia and ocean blue tones, refined presentation',
  },
  {
    key: 'inktgrens',
    title: 'Inktgrens',
    artistName: 'Mila Hartman',
    technique: 'Papiercollage en inkt',
    year: '2024',
    series: 'Fragmenten',
    status: 'gereserveerd',
    askingPrice: '1160',
    heightCm: '64',
    widthCm: '48',
    depthCm: '3',
    prompt:
      'front-facing gallery photo of a contemporary paper collage with bold ink border lines, torn paper edges, ivory and charcoal contrast with subtle copper details',
  },
];

const demoSeedSummary: DemoCatalogSummary = {
  artworkCount: demoArtworks.length,
  artistCount: new Set(demoArtworks.map((artwork) => artwork.artistName)).size,
  fairCount: 3,
};

export function getDemoSeedSummary(): DemoCatalogSummary {
  return demoSeedSummary;
}

export function getConfiguredFalKey() {
  const processLike = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return processLike.process?.env?.EXPO_PUBLIC_FAL_KEY?.trim() ?? '';
}

export async function seedDemoData(
  db: SQLiteDatabase,
  options: SeedDemoDataOptions = {}
): Promise<SeedDemoDataResult> {
  const onProgress = options.onProgress ?? (() => undefined);
  const falKey = options.falKey?.trim() || getConfiguredFalKey();
  const useFalImages = falKey.length > 0;

  onProgress('Bestaande demo-data opruimen...');
  await resetDemoData(db);

  onProgress(
    useFalImages
      ? 'Artworkbeelden genereren via fal.ai...'
      : 'Lokale placeholder-afbeeldingen voorbereiden...'
  );

  const artworkAssets = await prepareArtworkAssets(demoArtworks, {
    falKey,
    onProgress,
  });

  const fairs = buildDemoFairs();
  const artworkIds = new Map<string, string>();
  let contactCount = 0;

  onProgress('Demo-data opslaan in SQLite...');

  await runWriteTransaction(db, async (database) => {
    for (const fair of fairs) {
      fair.id = await saveFair(database, {
        name: fair.name,
        location: fair.location,
        startDate: fair.startDate,
        endDate: fair.endDate,
        notes: fair.notes,
      });
    }

    for (const artwork of demoArtworks) {
      const assets = artworkAssets.get(artwork.key);

      const artworkId = await saveArtwork(database, {
        artistName: artwork.artistName,
        photoPath: assets?.photoPath ?? null,
        thumbnailPath: assets?.thumbnailPath ?? null,
        title: artwork.title,
        heightCm: artwork.heightCm,
        widthCm: artwork.widthCm,
        depthCm: artwork.depthCm,
        askingPrice: artwork.askingPrice,
        technique: artwork.technique,
        year: artwork.year,
        series: artwork.series,
        status: artwork.status,
      });

      artworkIds.set(artwork.key, artworkId);
    }

    const activeFair = getFairByKey(fairs, 'active');
    const upcomingFair = getFairByKey(fairs, 'upcoming');
    const pastFair = getFairByKey(fairs, 'past');

    for (
      const key of [
        'stille_stroom',
        'getijdenruit',
        'kaslicht',
        'avondatelier',
        'nachtspoor',
        'schemeratlas',
      ] as const
    ) {
      await setFairArtworkIncluded(database, activeFair.id, artworkIds.get(key)!, true);
    }

    for (
      const key of ['betonwind', 'schemering_ii', 'papieren_getij', 'tijdbalk', 'overgroeid_pad'] as const
    ) {
      await setFairArtworkIncluded(database, upcomingFair.id, artworkIds.get(key)!, true);
    }

    for (
      const key of ['morgenlicht', 'atelier_noord', 'zinderlijn', 'stad_in_relief', 'ritme_van_stof'] as const
    ) {
      await setFairArtworkIncluded(database, pastFair.id, artworkIds.get(key)!, true);
    }

    await createExpenseForFair(database, activeFair.id, {
      category: 'eten_drinken',
      amount: '45',
      description: 'Koffie en lunch op dag 1',
      receiptPhotoPath: null,
    });
    await createExpenseForFair(database, upcomingFair.id, {
      category: 'standhuur',
      amount: '320',
      description: 'Aanbetaling standhuur',
      receiptPhotoPath: null,
    });
    await createExpenseForFair(database, pastFair.id, {
      category: 'reiskosten',
      amount: '78',
      description: 'Brandstof en parkeren',
      receiptPhotoPath: null,
    });
    await createExpenseForFair(database, pastFair.id, {
      category: 'standhuur',
      amount: '420',
      description: 'Standhuur weekend Breda',
      receiptPhotoPath: null,
    });

    await createSaleForFair(database, pastFair.id, {
      artworkId: artworkIds.get('morgenlicht')!,
      askingPrice: '1450',
      discount: '50',
      paymentStatus: 'betaald',
      paymentMethod: 'pin',
      contactId: '',
      contactName: 'Marieke Bos',
      contactEmail: 'marieke@example.com',
      contactPhone: '+31612345678',
      contactType: 'koper',
    });
    contactCount += 1;

    await createSaleForFair(database, pastFair.id, {
      artworkId: artworkIds.get('atelier_noord')!,
      askingPrice: '980',
      discount: '0',
      paymentStatus: 'nog_niet_betaald',
      paymentMethod: 'overschrijving',
      contactId: '',
      contactName: 'Galerie Houtwal',
      contactEmail: 'info@galeriehoutwal.nl',
      contactPhone: '',
      contactType: 'koper',
    });
    contactCount += 1;

    const prospectId = await saveContact(database, {
      name: 'Sanne de Groot',
      email: 'sanne@example.com',
      phone: '+31687654321',
      type: 'geinteresseerde',
      fairId: activeFair.id,
      notes: 'Wil na de beurs een overzicht van werk uit de serie Lichtval.',
    });
    contactCount += 1;

    await createSaleForFair(database, activeFair.id, {
      artworkId: artworkIds.get('kaslicht')!,
      askingPrice: '1650',
      discount: '150',
      paymentStatus: 'betaald',
      paymentMethod: 'pin',
      contactId: prospectId,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactType: 'koper',
    });
  });

  onProgress('Demo-data klaar.');

  return {
    artworkCount: demoSeedSummary.artworkCount,
    artistCount: demoSeedSummary.artistCount,
    fairCount: demoSeedSummary.fairCount,
    contactCount,
    usedFalImages: useFalImages,
  };
}

export async function resetDemoData(db: SQLiteDatabase) {
  const artworks = await listArtworks(db);

  for (const artwork of artworks) {
    if (artwork.photoPath && !artwork.photoPath.startsWith('data:')) {
      await safeDeleteManagedArtworkPhoto(artwork.photoPath);
    }

    if (artwork.thumbnailPath && !artwork.thumbnailPath.startsWith('data:')) {
      await safeDeleteManagedArtworkPhoto(artwork.thumbnailPath);
    }
  }

  await runWriteTransaction(db, async (database) => {
    await database.execAsync(`
      DELETE FROM contact_artworks;
      DELETE FROM sales;
      DELETE FROM expenses;
      DELETE FROM fair_artworks;
      DELETE FROM contacts;
      DELETE FROM fairs;
      DELETE FROM artworks;
      DELETE FROM artists;
    `);
  });
}

async function prepareArtworkAssets(
  artworks: DemoArtworkPreset[],
  options: { falKey: string; onProgress: (message: string) => void }
) {
  const results = new Map<string, { photoPath: string | null; thumbnailPath: string | null }>();

  if (!options.falKey) {
    for (const artwork of artworks) {
      const placeholder = createArtworkPlaceholderDataUri(artwork);
      results.set(artwork.key, {
        photoPath: placeholder,
        thumbnailPath: placeholder,
      });
    }

    return results;
  }

  fal.config({
    credentials: options.falKey,
  });

  for (let index = 0; index < artworks.length; index += 1) {
    const artwork = artworks[index];
    options.onProgress(`fal.ai beeld ${index + 1}/${artworks.length}: ${artwork.title}`);

    try {
      const imageUrl = await generateFalArtworkImageUrl(artwork);
      const persisted = await persistArtworkPhotoAssetsAsync(imageUrl);
      results.set(artwork.key, persisted);
    } catch (error) {
      console.error('fal image generation failed, falling back to placeholder', error);
      const placeholder = createArtworkPlaceholderDataUri(artwork);
      results.set(artwork.key, {
        photoPath: placeholder,
        thumbnailPath: placeholder,
      });
    }
  }

  return results;
}

async function generateFalArtworkImageUrl(artwork: DemoArtworkPreset) {
  const result = await fal.subscribe('fal-ai/flux-2/flash', {
    input: {
      prompt: artwork.prompt,
      image_size: {
        width: 768,
        height: 1024,
      },
      num_images: 1,
      output_format: 'jpeg',
      guidance_scale: 2.5,
      seed: buildSeedFromArtwork(artwork.key),
    },
    startTimeout: 30,
  });

  const imageUrl = result.data?.images?.[0]?.url;

  if (!imageUrl) {
    throw new Error(`Geen beeld-URL ontvangen voor ${artwork.title}.`);
  }

  return imageUrl;
}

function createArtworkPlaceholderDataUri(artwork: DemoArtworkPreset) {
  const background = colorForKey(artwork.key, 0);
  const accent = colorForKey(artwork.key, 1);
  const detail = colorForKey(artwork.key, 2);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="${background}" />
      <rect x="120" y="120" width="960" height="660" rx="48" fill="${accent}" />
      <circle cx="400" cy="390" r="170" fill="${detail}" opacity="0.82" />
      <rect x="610" y="250" width="280" height="260" rx="36" fill="#FFF8EE" opacity="0.85" />
      <text x="150" y="790" fill="#FFFDF9" font-size="64" font-family="Arial">${escapeXml(
        artwork.title
      )}</text>
      <text x="150" y="850" fill="#F3EBDD" font-size="34" font-family="Arial">${escapeXml(
        artwork.artistName
      )}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildDemoFairs(): Array<DemoFairPreset & { id: string }> {
  const today = new Date();

  return [
    {
      id: '',
      key: 'past',
      name: 'Kunstbeurs Breda',
      location: 'Breda',
      startDate: dateToLocalIso(addDays(today, -9)),
      endDate: dateToLocalIso(addDays(today, -7)),
      notes: 'Compacte lentebeurs met veel interieurpubliek.',
    },
    {
      id: '',
      key: 'active',
      name: 'Lente Salon Utrecht',
      location: 'Utrecht',
      startDate: dateToLocalIso(addDays(today, -1)),
      endDate: dateToLocalIso(addDays(today, 1)),
      notes: 'Actieve beursdag-context voor snelle verkoop en contacten.',
    },
    {
      id: '',
      key: 'upcoming',
      name: 'Atelierroute Delft',
      location: 'Delft',
      startDate: dateToLocalIso(addDays(today, 12)),
      endDate: dateToLocalIso(addDays(today, 13)),
      notes: 'Voorbereiding voor een kleinschalige route met focus op nieuw werk.',
    },
  ];
}

function getFairByKey(
  fairs: Array<DemoFairPreset & { id: string }>,
  key: DemoFairPreset['key']
) {
  const fair = fairs.find((entry) => entry.key === key);

  if (!fair) {
    throw new Error(`Demo fair ${key} ontbreekt.`);
  }

  return fair;
}

async function runWriteTransaction(
  db: SQLiteDatabase,
  task: (database: SQLiteDatabase) => Promise<void>
) {
  if (Platform.OS === 'web') {
    await task(db);
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await task(txn);
  });
}

async function safeDeleteManagedArtworkPhoto(uri: string) {
  const { deleteArtworkPhotoAsync } = await import('@/src/domains/inventory/artworkStorage');
  await deleteArtworkPhotoAsync(uri);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function buildSeedFromArtwork(key: string) {
  return Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 2000);
}

function colorForKey(key: string, offset: number) {
  const palette = ['#4D6A6D', '#A96A4C', '#7B86B0', '#D0B388', '#6A4D5B', '#3F5D49'];
  const total = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[(total + offset) % palette.length];
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
