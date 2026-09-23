import { unzipSync, strFromU8 } from "fflate";
export async function readDocument(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["txt", "md", "docx"].includes(ext || ""))
    throw new Error(
      "支持 Word（.docx）、MD、TXT；旧版 .doc 请先另存为 .docx。",
    );
  if (file.size > 5_000_000) throw new Error("文件不能超过 5 MB。");
  const data = new Uint8Array(await file.arrayBuffer());
  if (ext !== "docx")
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  let xml: string;
  try {
    const entries = unzipSync(data, {
      filter: (entry) => {
        if (entry.name !== "word/document.xml") return false;
        if (entry.originalSize > 2_000_000) throw new Error("文档内容过大");
        return true;
      },
    });
    if (!entries["word/document.xml"]) throw new Error("缺少正文");
    xml = strFromU8(entries["word/document.xml"]);
  } catch {
    throw new Error(
      "无法读取此 Word 文件，请检查是否损坏或加密，或另存为 TXT。",
    );
  }
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  if (dom.querySelector("parsererror")) throw new Error("Word 正文格式异常。");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const content = Array.from(dom.getElementsByTagNameNS(ns, "p"))
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(ns, "t"))
        .map((n) => n.textContent || "")
        .join(""),
    )
    .join("\n");
  if (!content.trim())
    throw new Error("没有可读取的文字；图片或扫描件请先转成文字。");
  return content;
}
