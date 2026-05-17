import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ArticleSectionVariant = "default" | "accent" | "cta" | "note";

export type ArticleSection = {
  icon?: string;
  title: string;
  image?: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  variant?: ArticleSectionVariant;
  buttonLabel?: string;
  buttonHref?: string;
};

export type ArticleItem = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  readTime: string;
  introduction: string[];
  sections: ArticleSection[];
};

export type CreateArticleInput = {
  slug?: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  readTime: string;
  introduction: string[];
  sections: ArticleSection[];
};

export type UpdateArticleInput = CreateArticleInput;

const articlesFilePath = path.join(process.cwd(), "data", "articles.json");

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSection(section: Partial<ArticleSection>): ArticleSection | null {
  const title = typeof section.title === "string" ? section.title.trim() : "";

  if (!title) {
    return null;
  }

  const intro = typeof section.intro === "string" ? section.intro.trim() : "";
  const paragraphs = Array.isArray(section.paragraphs)
    ? section.paragraphs.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const bullets = Array.isArray(section.bullets)
    ? section.bullets.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const variant: ArticleSectionVariant =
    section.variant === "accent" || section.variant === "cta" || section.variant === "note" ? section.variant : "default";

  return {
    title,
    image: typeof section.image === "string" && section.image.trim() ? section.image.trim() : undefined,
    intro: intro || undefined,
    paragraphs: paragraphs.length ? paragraphs : undefined,
    bullets: bullets.length ? bullets : undefined,
    variant,
    buttonLabel: typeof section.buttonLabel === "string" && section.buttonLabel.trim() ? section.buttonLabel.trim() : undefined,
    buttonHref: typeof section.buttonHref === "string" && section.buttonHref.trim() ? section.buttonHref.trim() : undefined
  };
}

function normalizeArticle(article: Partial<ArticleItem>): ArticleItem | null {
  const title = typeof article.title === "string" ? article.title.trim() : "";
  const slug = typeof article.slug === "string" ? slugify(article.slug) : slugify(title);
  const category = typeof article.category === "string" ? article.category.trim() : "";
  const excerpt = typeof article.excerpt === "string" ? article.excerpt.trim() : "";
  const image = typeof article.image === "string" && article.image.trim() ? article.image.trim() : "/images/categories/recommended.jpg";
  const publishedAt = typeof article.publishedAt === "string" && article.publishedAt.trim() ? article.publishedAt.trim() : "8 เมษายน 2026";
  const readTime = typeof article.readTime === "string" && article.readTime.trim() ? article.readTime.trim() : "อ่าน 5 นาที";
  const introduction = Array.isArray(article.introduction)
    ? article.introduction.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const sections = Array.isArray(article.sections)
    ? article.sections.map((section) => normalizeSection(section)).filter((section): section is ArticleSection => Boolean(section))
    : [];

  if (!title || !slug || !category || !excerpt || !introduction.length || !sections.length) {
    return null;
  }

  return {
    slug,
    category,
    title,
    excerpt,
    image,
    publishedAt,
    readTime,
    introduction,
    sections
  };
}

async function ensureArticlesDirectory() {
  await mkdir(path.dirname(articlesFilePath), { recursive: true });
}

async function persistArticles(articles: ArticleItem[]) {
  await ensureArticlesDirectory();
  await writeFile(articlesFilePath, JSON.stringify(articles, null, 2), "utf8");
}

export const defaultArticles: ArticleItem[] = [
  {
    slug: "drink-guide-for-every-occasion",
    category: "คู่มือเริ่มต้น",
    title: "โลกของเครื่องดื่ม: คู่มือเลือกเครื่องดื่มให้เหมาะกับคุณ",
    excerpt: "ค้นพบรสชาติใหม่ ๆ พร้อมเคล็ดลับการเลือกเครื่องดื่มที่ใช่ สำหรับทุกโอกาส",
    image: "/images/categories/recommended.jpg",
    publishedAt: "8 เมษายน 2026",
    readTime: "อ่าน 5 นาที",
    introduction: [
      "เครื่องดื่มแต่ละประเภทมีเอกลักษณ์เฉพาะตัว ทั้งในเรื่องของรสชาติ กลิ่น และวิธีการดื่ม ไม่ว่าคุณจะเป็นมือใหม่หรือผู้ที่ชื่นชอบอยู่แล้ว การเข้าใจพื้นฐานของเครื่องดื่มจะช่วยให้คุณเลือกสิ่งที่เหมาะกับตัวเองได้ง่ายขึ้น",
      "PattayaBev รวบรวมข้อมูลและคำแนะนำ เพื่อให้คุณได้สัมผัสประสบการณ์การดื่มที่ดียิ่งขึ้น พร้อมเลือกซื้อได้ง่ายในที่เดียว"
    ],
    sections: [
      {
        icon: "🥃",
        title: "ประเภทของเครื่องดื่มยอดนิยม",
        intro: "เครื่องดื่มแอลกอฮอล์สามารถแบ่งออกเป็นหลายประเภทตามรสชาติและสไตล์การดื่ม",
        bullets: [
          "วิสกี้: รสเข้ม มีกลิ่นไม้และควัน",
          "ไวน์: มีทั้งแดง ขาว และโรเซ่ เหมาะกับอาหารหลากหลาย",
          "เบียร์: ดื่มง่าย สดชื่น เหมาะกับหลายโอกาส",
          "วอดก้า: รสสะอาด นิยมใช้ในค็อกเทล",
          "รัม: หอมหวานจากอ้อย เหมาะกับเครื่องดื่มผสม"
        ]
      },
      {
        icon: "✨",
        title: "วิธีเลือกเครื่องดื่มให้เหมาะกับคุณ",
        intro: "การเลือกเครื่องดื่มที่ดีควรพิจารณาจากรสชาติ โอกาส และงบประมาณร่วมกัน",
        bullets: [
          "เลือกรสชาติที่ชอบ เช่น หวาน เปรี้ยว ขม หรือเข้ม",
          "ดูโอกาสในการดื่ม เช่น งานสังสรรค์ ดินเนอร์ หรือดื่มผ่อนคลาย",
          "เลือกให้เหมาะกับงบประมาณและคุณภาพ",
          "จับคู่กับอาหารให้เหมาะเพื่อเพิ่มประสบการณ์"
        ],
        variant: "accent"
      },
      {
        icon: "💡",
        title: "เคล็ดลับสำหรับการดื่มอย่างมีสไตล์",
        bullets: [
          "ใช้แก้วให้เหมาะกับประเภทเครื่องดื่ม",
          "ดื่มในปริมาณที่พอดี",
          "แช่เย็นในอุณหภูมิที่เหมาะสม",
          "ลองเปิดใจกับรสชาติใหม่ ๆ"
        ]
      },
      {
        icon: "🛒",
        title: "เลือกซื้อเครื่องดื่มคุณภาพกับ PattayaBev",
        intro: "เราคัดสรรเครื่องดื่มคุณภาพจากแบรนด์ชั้นนำ พร้อมบริการที่สะดวกและรวดเร็ว ให้คุณเลือกซื้อได้ง่ายในที่เดียว",
        variant: "cta",
        buttonLabel: "เลือกชมสินค้า",
        buttonHref: "/products"
      },
      {
        icon: "⚠️",
        title: "หมายเหตุ",
        paragraphs: ["กรุณาดื่มอย่างมีความรับผิดชอบ และไม่จำหน่ายให้ผู้ที่มีอายุต่ำกว่า 20 ปี"],
        variant: "note"
      }
    ]
  },
  {
    slug: "how-to-choose-whisky-for-your-bar",
    category: "ร้านอาหารและบาร์",
    title: "เลือกวิสกี้อย่างไรให้เหมาะกับบาร์และร้านอาหาร",
    excerpt: "แนวทางคัดวิสกี้ให้ตรงกับลูกค้า งบประมาณ และบรรยากาศร้าน เพื่อให้เมนูเครื่องดื่มขายง่ายขึ้น",
    image: "/images/categories/whisky.jpg",
    publishedAt: "6 เมษายน 2026",
    readTime: "อ่าน 4 นาที",
    introduction: [
      "การเลือกวิสกี้สำหรับร้านไม่ควรดูแค่ชื่อแบรนด์ แต่ควรดูว่าลูกค้าหลักของร้านชอบรสชาติแบบไหน และราคาเฉลี่ยต่อแก้วที่เหมาะสมอยู่ที่ระดับใด",
      "สำหรับร้านในพัทยาที่มีทั้งลูกค้าท้องถิ่นและนักท่องเที่ยว การมีทั้งวิสกี้ดื่มง่ายและขวดพรีเมียมจะช่วยให้ขายได้ครอบคลุมมากขึ้น"
    ],
    sections: [
      {
        title: "เริ่มจากสินค้าที่ขายง่ายก่อน",
        paragraphs: [
          "เริ่มจาก core range ที่ขายง่ายก่อน แล้วค่อยเพิ่มขวดพิเศษเพื่อสร้างมูลค่าเฉลี่ยต่อบิลในภายหลัง",
          "เมื่อร้านมีข้อมูลยอดขายจริงมากขึ้น จะช่วยให้เลือกขวดที่เหมาะกับลูกค้าประจำได้ชัดขึ้น"
        ]
      },
      {
        title: "สิ่งที่ควรพิจารณา",
        bullets: [
          "รสชาติหลักที่ลูกค้าของร้านชอบ",
          "ระดับราคาที่ขายได้จริงต่อแก้วหรือเป็นขวด",
          "ภาพลักษณ์ของร้านและเมนูปัจจุบัน",
          "ความพร้อมของทีมในการแนะนำสินค้า"
        ],
        variant: "accent"
      }
    ]
  },
  {
    slug: "wine-pairing-for-hospitality-business",
    category: "การบริการ",
    title: "จับคู่ไวน์กับเมนูอาหารให้ลูกค้าตัดสินใจง่ายขึ้น",
    excerpt: "หลักการง่าย ๆ สำหรับร้านอาหาร โรงแรม และบาร์ ที่ต้องการสร้างประสบการณ์การดื่มที่ดีขึ้นให้ลูกค้า",
    image: "/images/categories/premium-wine.jpg",
    publishedAt: "3 เมษายน 2026",
    readTime: "อ่าน 5 นาที",
    introduction: [
      "ไวน์ที่จับคู่กับอาหารได้ดี ช่วยให้ลูกค้าตัดสินใจสั่งง่ายขึ้น และยังช่วยเพิ่มความน่าสนใจของเมนูโดยรวม",
      "ร้านที่มีคำแนะนำสั้น ๆ ใต้เมนู หรือมีพนักงานช่วยจับคู่ให้ลูกค้า มักสร้างความประทับใจได้มากกว่า"
    ],
    sections: [
      {
        title: "หลักการพื้นฐาน",
        bullets: [
          "เมนูรสเบาเหมาะกับไวน์ที่สดชื่นและดื่มง่าย",
          "อาหารรสเข้มหรือมีซอสเข้มข้นเหมาะกับไวน์ที่มีโครงสร้างชัดขึ้น",
          "คำอธิบายสั้น ๆ บนเมนูช่วยให้ลูกค้าตัดสินใจง่ายกว่าเดิม"
        ]
      },
      {
        title: "สิ่งที่ร้านควรเตรียม",
        paragraphs: [
          "เตรียมไวน์ให้ครอบคลุมอย่างน้อย 3 สไตล์ เช่น ดื่มง่าย ดื่มคู่สเต็ก และไวน์สำหรับโอกาสพิเศษ",
          "ให้ทีมหน้าร้านเข้าใจความแตกต่างของแต่ละสไตล์ เพื่อช่วยแนะนำได้อย่างมั่นใจ"
        ],
        variant: "accent"
      }
    ]
  },
  {
    slug: "b2b-drinks-supply-in-pattaya",
    category: "ธุรกิจพัทยา",
    title: "บริการจัดหาเครื่องดื่มสำหรับธุรกิจในพัทยา",
    excerpt: "สิ่งที่โรงแรม บาร์ ร้านอาหาร และงานอีเวนต์ควรมองหา เมื่อเลือกพาร์ตเนอร์ด้านเครื่องดื่มในพื้นที่พัทยา",
    image: "/images/hero/wholesale.jpg",
    publishedAt: "1 เมษายน 2026",
    readTime: "อ่าน 4 นาที",
    introduction: [
      "สำหรับธุรกิจในพัทยา ความเร็วในการประสานงานและการจัดส่งเป็นปัจจัยสำคัญไม่แพ้คุณภาพสินค้า",
      "พาร์ตเนอร์ที่เข้าใจพื้นที่ เข้าใจรูปแบบลูกค้า และพร้อมช่วยคัดรายการให้เหมาะกับธุรกิจ จะช่วยลดเวลาตัดสินใจและบริหารสต็อกได้ดีขึ้น"
    ],
    sections: [
      {
        title: "สิ่งที่ควรมองหา",
        bullets: [
          "ตอบกลับรวดเร็วและประสานงานง่าย",
          "ช่วยคัดสินค้าให้เหมาะกับธุรกิจได้",
          "จัดส่งต่อเนื่องในพัทยาและพื้นที่ใกล้เคียง",
          "มีทีมดูแลหลังการขาย"
        ]
      },
      {
        title: "ทำไมธุรกิจในพัทยาควรวางแผนล่วงหน้า",
        paragraphs: [
          "พัทยามีทั้งลูกค้าท้องถิ่นและนักท่องเที่ยว ทำให้ความต้องการสินค้าเปลี่ยนเร็วตามฤดูกาลและกิจกรรมในเมือง",
          "การมีพาร์ตเนอร์ที่เตรียมสินค้าและแนะนำรายการได้ตรง จะช่วยให้ธุรกิจรับมือกับช่วงขายดีได้มั่นใจขึ้น"
        ],
        variant: "accent"
      }
    ]
  },
  {
    slug: "stock-planning-for-events-and-hotels",
    category: "การจัดการสต็อก",
    title: "วางแผนสต็อกเครื่องดื่มสำหรับโรงแรมและงานอีเวนต์",
    excerpt: "วิธีเตรียมสต็อกให้พอใช้จริง ลดของขาดและลดของค้าง โดยเฉพาะในช่วง high season",
    image: "/images/hero/partner.jpg",
    publishedAt: "29 มีนาคม 2026",
    readTime: "อ่าน 6 นาที",
    introduction: [
      "ธุรกิจบริการควรเริ่มจากการดูรูปแบบการขายจริงในช่วงที่ผ่านมา แล้วแบ่งสินค้าเป็นหมวดขายเร็ว ขายปานกลาง และขวดพิเศษ",
      "การคำนวณสต็อกไม่ควรอิงแค่จำนวนลูกค้า แต่ควรดูประเภทงาน ระยะเวลางาน และพฤติกรรมการสั่งของกลุ่มลูกค้าเป้าหมายด้วย"
    ],
    sections: [
      {
        title: "แนวทางวางแผน",
        bullets: [
          "ดูข้อมูลยอดขายย้อนหลังอย่างน้อย 2-3 ช่วงเวลา",
          "แยกสินค้าขายเร็วกับขวดพิเศษออกจากกัน",
          "วางแผนตามประเภทงานและฤดูกาล",
          "เลือก supplier ที่ตอบกลับเร็วเพื่อให้ปรับสต็อกได้ไว"
        ]
      },
      {
        title: "สัญญาณว่าควรเติมสินค้าเพิ่ม",
        paragraphs: [
          "เมื่อสินค้าขายเร็วเหลือน้อยกว่าระดับสำรองที่กำหนดไว้ ควรสั่งเพิ่มทันทีเพื่อหลีกเลี่ยงของขาด",
          "ในช่วงเทศกาลหรือมีอีเวนต์ใหญ่ในพัทยา ควรวางแผนล่วงหน้าเพื่อให้มีสต็อกพอรองรับ"
        ],
        variant: "accent"
      }
    ]
  },
  {
    slug: "gift-bottle-selection-for-corporate-clients",
    category: "ของขวัญองค์กร",
    title: "เลือกเครื่องดื่มสำหรับของขวัญองค์กรให้ดูพรีเมียม",
    excerpt: "ไอเดียคัดขวดและจัดชุดของขวัญสำหรับลูกค้าองค์กร ผู้บริหาร และโอกาสพิเศษ",
    image: "/images/categories/recommended.jpg",
    publishedAt: "24 มีนาคม 2026",
    readTime: "อ่าน 4 นาที",
    introduction: [
      "ของขวัญองค์กรที่ดีควรดูเหมาะสมกับภาพลักษณ์ของผู้ให้และผู้รับ พร้อมมีระดับราคาที่วางแผนได้",
      "การเลือกขวดที่หน้าตาดี แบรนด์น่าเชื่อถือ และมีการจัดชุดที่เรียบร้อย จะช่วยให้ของขวัญดูมีมูลค่ามากขึ้นทันที"
    ],
    sections: [
      {
        title: "แนวคิดในการเลือก",
        bullets: [
          "เลือกขวดที่ดูพรีเมียมและเหมาะกับโอกาส",
          "กำหนดงบประมาณต่อชุดให้ชัดเจน",
          "คำนึงถึงภาพลักษณ์ของบริษัทผู้ให้",
          "เลือกพาร์ตเนอร์ที่ช่วยดูแลการจัดชุดและการส่งได้ครบ"
        ]
      },
      {
        title: "สิ่งที่ช่วยให้ดูเป็นมืออาชีพ",
        paragraphs: [
          "กล่องหรือแพ็กเกจที่เรียบร้อยช่วยยกระดับของขวัญได้มาก",
          "ถ้ามีการ์ดหรือข้อความประกอบที่ชัดเจน จะช่วยให้ของขวัญดูใส่ใจและเหมาะกับการส่งมอบในนามองค์กร"
        ],
        variant: "accent"
      }
    ]
  }
];

export async function getArticles(): Promise<ArticleItem[]> {
  try {
    const raw = await readFile(articlesFilePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return defaultArticles;
    }

    const normalizedArticles = parsed
      .map((item) => normalizeArticle(item))
      .filter((item): item is ArticleItem => Boolean(item));

    return normalizedArticles.length ? normalizedArticles : defaultArticles;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return defaultArticles;
    }

    throw error;
  }
}

export async function getArticleBySlug(slug: string) {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function getArticleCategories() {
  const articles = await getArticles();
  return Array.from(new Set(articles.map((article) => article.category))).sort((left, right) => left.localeCompare(right, "th"));
}

export async function createArticle(input: CreateArticleInput) {
  const articles = await getArticles();
  const baseSlug = slugify(input.slug || input.title) || "article";
  let nextSlug = baseSlug;
  let attempt = 2;

  while (articles.some((article) => article.slug === nextSlug)) {
    nextSlug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }

  const article = normalizeArticle({
    ...input,
    slug: nextSlug
  });

  if (!article) {
    throw new Error("ข้อมูลบทความไม่ถูกต้อง");
  }

  const nextArticles = [article, ...articles];
  await persistArticles(nextArticles);

  return article;
}

export async function updateArticle(originalSlug: string, input: UpdateArticleInput) {
  const articles = await getArticles();
  const existingArticle = articles.find((article) => article.slug === originalSlug);

  if (!existingArticle) {
    throw new Error("ไม่พบบทความที่ต้องการแก้ไข");
  }

  const baseSlug = slugify(input.slug || input.title) || originalSlug;
  let nextSlug = baseSlug;
  let attempt = 2;

  while (articles.some((article) => article.slug === nextSlug && article.slug !== originalSlug)) {
    nextSlug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }

  const article = normalizeArticle({
    ...input,
    slug: nextSlug
  });

  if (!article) {
    throw new Error("ข้อมูลบทความไม่ถูกต้อง");
  }

  const nextArticles = articles.map((item) => (item.slug === originalSlug ? article : item));
  await persistArticles(nextArticles);

  return {
    article,
    previousSlug: existingArticle.slug
  };
}

export async function deleteArticle(slug: string) {
  const articles = await getArticles();
  const nextArticles = articles.filter((article) => article.slug !== slug);

  if (nextArticles.length === articles.length) {
    throw new Error("ไม่พบบทความที่ต้องการลบ");
  }

  await persistArticles(nextArticles);
}
