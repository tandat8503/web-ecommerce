"use client";
import React, { useRef, useState } from "react";

const SRL_ROLES = [
  { value: "ASPECT", label: "ASPECT", desc: "Phần sản phẩm được đề cập (ví dụ: chất lượng, thiết kế, giá cả, dịch vụ)" },
  { value: "OPINION", label: "OPINION", desc: "Ý kiến, cảm xúc (ví dụ: tốt, tệ, hài lòng, thất vọng)" },
  { value: "HOLDER", label: "HOLDER", desc: "Người đưa ra ý kiến (thường là khách hàng, có thể ẩn)" },
  { value: "MODALITY", label: "MODALITY", desc: "Mức độ, sắc thái (ví dụ: 'rất tốt', 'khá ổn', 'hoàn toàn hài lòng')" },
];

const SAMPLE_TEXTS = [
  "Tôi rất hài lòng với chất lượng bàn làm việc này, thiết kế đẹp và giá cả hợp lý.",
  "Ghế văn phòng này không thoải mái như tôi mong đợi, lưng hơi cứng.",
  "Dịch vụ giao hàng nhanh chóng, nhân viên tư vấn nhiệt tình." 
];

const SENTIMENTS = [
  { value: "joy", label: "Joy", color: "bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100" },
  { value: "sadness", label: "Sadness", color: "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100" },
  { value: "anticipation", label: "Anticipation", color: "bg-orange-200 text-orange-900 dark:bg-orange-700 dark:text-orange-100" },
  { value: "anger", label: "Anger", color: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-100" },
  { value: "optimism", label: "Optimism", color: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100" },
  { value: "surprise", label: "Surprise", color: "bg-pink-200 text-pink-900 dark:bg-pink-700 dark:text-pink-100" },
  { value: "fear", label: "Fear", color: "bg-purple-200 text-purple-900 dark:bg-purple-700 dark:text-purple-100" },
  { value: "disgust", label: "Disgust", color: "bg-teal-200 text-teal-900 dark:bg-teal-700 dark:text-teal-100" },
];

// Aspect categories for ASPECT role - E-commerce focused
const ASPECT_CATEGORIES = [
  { value: "quality", label: "Quality (Chất lượng)", desc: "Đánh giá chất lượng sản phẩm, độ bền, vật liệu." },
  { value: "design", label: "Design (Thiết kế)", desc: "Đánh giá về thiết kế, kiểu dáng, màu sắc, thẩm mỹ." },
  { value: "price", label: "Price (Giá cả)", desc: "Đánh giá về giá cả, giá trị, tính hợp lý của giá." },
  { value: "service", label: "Service (Dịch vụ)", desc: "Đánh giá dịch vụ khách hàng, tư vấn, hỗ trợ." },
  { value: "delivery", label: "Delivery (Giao hàng)", desc: "Đánh giá về tốc độ giao hàng, đóng gói, vận chuyển." },
  { value: "functionality", label: "Functionality (Tính năng)", desc: "Đánh giá về chức năng, tiện ích, khả năng sử dụng." },
  { value: "durability", label: "Durability (Độ bền)", desc: "Đánh giá về độ bền, tuổi thọ sản phẩm." },
  { value: "comfort", label: "Comfort (Tiện nghi)", desc: "Đánh giá về sự thoải mái, tiện lợi khi sử dụng." },
  { value: "overall", label: "Overall (Tổng quan)", desc: "Ấn tượng chung, mức độ hài lòng tổng thể." },
];

type Label = {
  wordIndices: number[]; // indices of words in the sentence
  text: string;
  role: string;
  start?: number;
  end?: number;
  emotion?: string; // Only for ASPECT
  aspectCategory?: string; // Only for ASPECT
};

function getWordCharRange(words: string[], wordIndices: number[]): { start: number; end: number } {
  // Find the character start/end for a set of word indices
  let idx = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < words.length; i++) {
    if (wordIndices.includes(i)) {
      if (start === -1) start = idx;
      end = idx + words[i].length;
    }
    idx += words[i].length + 1; // +1 for space
  }
  return { start, end };
}

// Heuristic: suggest aspect category from selected text - E-commerce focused
function suggestAspectCategoryForText(text: string): string | null {
  const t = text.toLowerCase();
  // Quality cues
  const qualityCues = ["chất lượng", "chat luong", "bền", "ben", "vật liệu", "vat lieu", "gỗ", "go", "sắt", "sat", "nhựa", "nhua"];
  if (qualityCues.some(k => t.includes(k))) return "quality";
  // Design cues
  const designCues = ["thiết kế", "thiet ke", "đẹp", "dep", "kiểu dáng", "kieu dang", "màu sắc", "mau sac", "thẩm mỹ", "tham my"];
  if (designCues.some(k => t.includes(k))) return "design";
  // Price cues
  const priceCues = ["giá", "gia", "giá cả", "gia ca", "rẻ", "re", "đắt", "dat", "hợp lý", "hop ly", "phải chăng", "phai chang"];
  if (priceCues.some(k => t.includes(k))) return "price";
  // Service cues
  const serviceCues = ["dịch vụ", "dich vu", "tư vấn", "tu van", "hỗ trợ", "ho tro", "nhân viên", "nhan vien", "chăm sóc", "cham soc"];
  if (serviceCues.some(k => t.includes(k))) return "service";
  // Delivery cues
  const deliveryCues = ["giao hàng", "giao hang", "vận chuyển", "van chuyen", "đóng gói", "dong goi", "nhanh", "chậm", "cham"];
  if (deliveryCues.some(k => t.includes(k))) return "delivery";
  // Functionality cues
  const functionalityCues = ["chức năng", "chuc nang", "tính năng", "tinh nang", "tiện ích", "tien ich", "sử dụng", "su dung"];
  if (functionalityCues.some(k => t.includes(k))) return "functionality";
  // Durability cues
  const durabilityCues = ["độ bền", "do ben", "tuổi thọ", "tuoi tho", "lâu", "lau", "bền bỉ", "ben bi"];
  if (durabilityCues.some(k => t.includes(k))) return "durability";
  // Comfort cues
  const comfortCues = ["thoải mái", "thoai mai", "tiện nghi", "tien nghi", "dễ chịu", "de chiu", "comfortable"];
  if (comfortCues.some(k => t.includes(k))) return "comfort";
  return null;
}

export default function Home() {
  const [texts, setTexts] = useState<string[]>(SAMPLE_TEXTS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [labels, setLabels] = useState<Label[][]>(Array(SAMPLE_TEXTS.length).fill([]));
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>(SRL_ROLES[0].value);
  // Remove sentence-level emotion state and logic
  // Remove:
  //   const [sentiments, setSentiments] = useState<(string | null)[]>(Array(SAMPLE_TEXTS.length).fill(null));
  //   const [selectedSentiment, setSelectedSentiment] = useState<string>("");
  //   React.useEffect(() => { setSelectedSentiment(sentiments[currentIdx] || ""); }, [currentIdx]);
  //   const handleSaveSentiment = ...
  //   All UI for sentence-level emotion
  //
  // Add emotion to Label type (only for ASPECT)
  const [aspectEmotion, setAspectEmotion] = useState<string>("");
  // Add aspect category for ASPECT
  const [aspectCategory, setAspectCategory] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split sentence into words (keep punctuation attached)
  const words = texts[currentIdx]?.match(/[^\s]+/g) || [];
  const sentence = texts[currentIdx] || "";

  // Handle word click (select/deselect for labeling)
  const handleWordClick = (idx: number) => {
    setSelectedWords((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  // Combine selected words into one label
  const handleSaveLabel = () => {
    if (selectedWords.length === 0) return;
    const sorted = [...selectedWords].sort((a, b) => a - b);
    const text = sorted.map((i) => words[i]).join(" ");
    // Prevent duplicate/overlapping labels
    const currentLabels = labels[currentIdx] || [];
    if (currentLabels.some((l) => l.wordIndices.some((i) => sorted.includes(i)))) return;
    // Calculate char start/end
    const { start, end } = getWordCharRange(words, sorted);
    let newLabel: Label;
    if (selectedRole === "ASPECT") {
      // Require emotion & aspect category per guideline; try suggest category if empty
      if (!aspectEmotion) {
        showToast("Vui lòng chọn Emotion cho ASPECT");
        return;
      }
      const suggested = suggestAspectCategoryForText(text);
      const categoryToUse = (aspectCategory || suggested || "");
      if (!categoryToUse) {
        showToast("Vui lòng chọn Aspect cho ASPECT");
        return;
      }
      newLabel = {
        wordIndices: sorted,
        text,
        role: selectedRole,
        start,
        end,
        emotion: aspectEmotion,
        aspectCategory: categoryToUse,
      };
    } else {
      newLabel = { wordIndices: sorted, text, role: selectedRole, start, end };
    }
    const newLabels = labels.map((arr, i) =>
      i === currentIdx ? [...arr, newLabel] : arr
    );
    setLabels(newLabels);
    setSelectedWords([]);
    setAspectEmotion("");
    setAspectCategory("");
    showToast("Đã lưu nhãn");
  };

  // Remove a label
  const handleRemoveLabel = (labelIdx: number) => {
    const newLabels = labels.map((arr, i) =>
      i === currentIdx ? arr.filter((_, idx) => idx !== labelIdx) : arr
    );
    setLabels(newLabels);
    showToast("Đã xóa nhãn");
  };

  // Reset all labels for current text
  const handleResetLabels = () => {
    const newLabels = labels.map((arr, i) => (i === currentIdx ? [] : arr));
    setLabels(newLabels);
    setSelectedWords([]);
    showToast("Đã xóa tất cả nhãn của câu hiện tại");
  };

  const handleClearSelection = () => {
    setSelectedWords([]);
    showToast("Đã bỏ chọn từ");
  };

  // Toast helper
  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1600);
  }

  // Keyboard shortcuts: Left/Right to navigate, Enter to save, Esc to clear
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Enter") {
        if (selectedWords.length > 0) {
          e.preventDefault();
          handleSaveLabel();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedWords, currentIdx, texts.length, selectedRole, aspectEmotion, aspectCategory]);

  // Navigation
  const handlePrev = () => {
    setCurrentIdx((idx) => Math.max(0, idx - 1));
    setSelectedWords([]);
  };
  const handleNext = () => {
    setCurrentIdx((idx) => Math.min(texts.length - 1, idx + 1));
    setSelectedWords([]);
  };

  // When navigating, update selectedSentiment to match currentIdx
  // React.useEffect(() => {
  //   setSelectedSentiment(sentiments[currentIdx] || "");
  // }, [currentIdx]);

  // Save sentiment for current sentence
  // const handleSaveSentiment = () => {
  //   const newSentiments = sentiments.map((s, i) =>
  //     i === currentIdx ? selectedSentiment : s
  //   );
  //   setSentiments(newSentiments);
  // };

  // CSV Upload (now only takes 'text' column)
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      // Parse CSV
      const lines = content.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return;
      let textColIdx = 0;
      let startIdx = 0;
      const header = lines[0].split(";");
      if (header.some(h => h.trim().toLowerCase() === "text")) {
        textColIdx = header.findIndex(h => h.trim().toLowerCase() === "text");
        startIdx = 1;
      }
      const texts: string[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const row = lines[i].split(";");
        if (row.length > textColIdx) {
          texts.push(row[textColIdx].replace(/^"|"$/g, ""));
        }
      }
      setTexts(texts);
      setLabels(Array(texts.length).fill([]));
      // setSentiments(Array(texts.length).fill(null)); // Removed
      setCurrentIdx(0);
    };
    reader.readAsText(file);
  };

  // Build export data for JSON
  const buildExportData = () => {
    return texts.map((text, idx) => {
      const labelObjs = (labels[idx] || []).map((label) => {
        // If start/end not present, calculate from wordIndices
        let start = label.start;
        let end = label.end;
        if (start === undefined || end === undefined) {
          const w = text.match(/[^\s]+/g) || [];
          const range = getWordCharRange(w, label.wordIndices);
          start = range.start;
          end = range.end;
        }
        // Include emotion/aspectCategory only for ASPECT
        const base: any = { role: label.role, text: label.text, start, end };
        if (label.role === "ASPECT") {
          if (label.emotion) base.emotion = label.emotion;
          if (label.aspectCategory) base.aspectCategory = label.aspectCategory;
        }
        return base;
      });
      return { text, labels: labelObjs };
    })
    // Only keep items with at least one label or a sentiment
    .filter(item => item.labels && item.labels.length > 0);
  };

  // Save to SQLite database
  const handleSaveToDatabase = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/save-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: texts,
          labels: labels,
          session_name: `Session_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        showToast(`✅ Đã lưu ${result.saved_count} texts vào database`);
      } else {
        const error = await response.json();
        showToast(`❌ Lỗi: ${error.error || 'Không thể lưu vào database'}`);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      showToast("❌ Lỗi kết nối đến API server");
    }
  };

  // Export to JSON (download) - Keep for backup
  const handleExport = () => {
    const exportData = buildExportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labels.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải labels.json");
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    const exportData = buildExportData();
    const payload = JSON.stringify(exportData, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      showToast("Đã copy JSON vào clipboard");
    } catch {
      showToast("Copy thất bại");
    }
  };

  // Export remaining unlabeled data to CSV
  const handleExportUnlabeled = () => {
    // Unlabeled: no labels and no sentiment
    const unlabeled = texts.filter((_, idx) => {
      const hasLabels = (labels[idx] && labels[idx].length > 0);
      // const hasSentiment = sentiments[idx]; // Removed
      return !hasLabels;
    });
    if (unlabeled.length === 0) {
      alert("All data has been labeled!");
      return;
    }
    let csv = 'text\n';
    unlabeled.forEach(text => {
      // Escape quotes
      const safeText = '"' + text.replace(/"/g, '""') + '"';
      csv += safeText + '\n';
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unlabeled.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Highlight labeled spans by character range
  function renderSentenceWithLabels() {
    const currentLabels = (labels[currentIdx] || []).filter(l => l.start !== undefined && l.end !== undefined);
    // Sort labels by start
    const sortedLabels = [...currentLabels].sort((a, b) => (a.start! - b.start!));
    let result: React.ReactNode[] = [];
    let idx = 0;
    for (let i = 0; i < sortedLabels.length; i++) {
      const l = sortedLabels[i];
      if (l.start! > idx) {
        result.push(<span key={"plain-" + idx}>{sentence.slice(idx, l.start)}</span>);
      }
      const colorMap: Record<string, string> = {
        ASPECT: "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 font-semibold",
        OPINION: "bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100 font-semibold",
        HOLDER: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100 font-semibold",
        MODALITY: "bg-orange-200 text-orange-900 dark:bg-orange-700 dark:text-orange-100 font-semibold",
      };
      const color = colorMap[l.role as keyof typeof colorMap] || "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 font-semibold";
      result.push(
        <span key={"label-" + i} className={`rounded px-1 mx-0.5 ${color}`}>{sentence.slice(l.start!, l.end!)}</span>
      );
      idx = l.end!;
    }
    if (idx < sentence.length) {
      result.push(<span key={"plain-end"}>{sentence.slice(idx)}</span>);
    }
    return result;
  }

  return (
    <div className="w-full min-h-screen py-4 px-2 sm:py-6 sm:px-4 dark:bg-gray-900 font-sans" style={{ fontFamily: `'Noto Sans', Arial, Helvetica, sans-serif` }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-gray-100">E-commerce SRL Labeling Tool</h1>
          {toast && (
            <div className="text-sm bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 px-3 py-1 rounded shadow">
              {toast}
            </div>
          )}
        </div>
      {/* Top Bar: Upload & Export */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4 items-center justify-between w-full px-1 sm:px-0 text-base">
        <form id="upload-form" className="flex gap-2 items-center w-full sm:w-auto" onSubmit={handleUpload}>
          <input ref={fileInputRef} type="file" accept=".csv" className="border rounded px-1 py-1 sm:px-2 dark:bg-gray-900 dark:text-gray-100 w-full sm:w-48 text-sm sm:text-base" />
          <button type="submit" className="bg-blue-600 text-white rounded px-2 py-1 sm:px-4 sm:py-1.5 hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto">Upload</button>
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleSaveToDatabase} className="bg-blue-600 text-white rounded px-2 py-1 sm:px-4 sm:py-1.5 hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base">💾 Lưu vào Database</button>
          <button onClick={handleExport} className="bg-green-600 text-white rounded px-2 py-1 sm:px-4 sm:py-1.5 hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base">📄 Export JSON</button>
          <button onClick={handleCopyJson} className="bg-emerald-600 text-white rounded px-2 py-1 sm:px-4 sm:py-1.5 hover:bg-emerald-700 w-full sm:w-auto text-sm sm:text-base">📋 Copy JSON</button>
          <button onClick={handleExportUnlabeled} className="bg-yellow-500 text-white rounded px-2 py-1 sm:px-4 sm:py-1.5 hover:bg-yellow-600 w-full sm:w-auto text-sm sm:text-base">📊 Export Unlabeled CSV</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2 sm:gap-4 w-full">
        {/* Left Column: Labeling, Sentiment, Descriptions */}
        <div className="w-full md:w-2/3 flex flex-col gap-1 sm:gap-2 text-base">
          {/* Navigation & Sentence */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1 w-full">
            <button onClick={handlePrev} className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 rounded text-sm sm:text-base disabled:opacity-50" disabled={currentIdx === 0}>Previous</button>
            <span className="text-gray-500 dark:text-gray-300 text-sm sm:text-base">Text {currentIdx + 1} of {texts.length}</span>
            <button onClick={handleNext} className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 rounded text-sm sm:text-base disabled:opacity-50" disabled={currentIdx === texts.length - 1}>Next</button>
          </div>
          {/* Sentence with highlights */}
          <div className="border rounded p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 text-base sm:text-lg min-h-[40px] sm:min-h-[48px] mb-1 w-full overflow-x-auto">
            {renderSentenceWithLabels()}
          </div>
          {/* Sentiment Labeling */}
          {/* Remove sentence-level emotion UI */}
          {/* Words Display */}
          <div className="flex flex-wrap gap-1.5 p-2 sm:p-3 border rounded min-h-[36px] sm:min-h-[42px] bg-gray-50 dark:bg-gray-900 mb-1 w-full overflow-x-auto text-base sm:text-lg">
            {words.map((word, idx) => {
              const label = (labels[currentIdx] || []).find(l => l.wordIndices.includes(idx));
              const isSelected = selectedWords.includes(idx);
              return (
                <span
                  key={idx}
                  className={`cursor-pointer px-2.5 py-0.5 rounded transition select-none text-base sm:text-lg border
                    ${label ? "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 font-semibold border-blue-300 dark:border-blue-700" : isSelected ? "bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100 font-semibold border-yellow-300 dark:border-yellow-600" : "hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-100 border-transparent"}`}
                  onClick={() => handleWordClick(idx)}
                >
                  {word}
                </span>
              );
            })}
          </div>
          {/* Label Controls */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 w-full">
            <label htmlFor="role-select" className="font-semibold dark:text-gray-100 text-sm sm:text-base">Role:</label>
            <select
              id="role-select"
              className="border rounded px-1 py-1 sm:px-2 text-sm sm:text-base dark:bg-gray-900 dark:text-gray-100"
              value={selectedRole}
              onChange={e => { setSelectedRole(e.target.value); setAspectEmotion(""); setAspectCategory(""); }}
            >
              {SRL_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {/* Show emotion dropdown only for ASPECT */}
            {selectedRole === "ASPECT" && (
              <>
                <label className="font-semibold dark:text-gray-100 text-sm sm:text-base ml-2">Aspect:</label>
                <select
                  className="border rounded px-1 py-1 sm:px-2 text-sm sm:text-base dark:bg-gray-900 dark:text-gray-100"
                  value={aspectCategory}
                  onChange={e => setAspectCategory(e.target.value)}
                >
                  <option value="">None</option>
                  {ASPECT_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <label className="font-semibold dark:text-gray-100 text-sm sm:text-base ml-2">Emotion:</label>
                <select
                  className="border rounded px-1 py-1 sm:px-2 text-sm sm:text-base dark:bg-gray-900 dark:text-gray-100"
                  value={aspectEmotion}
                  onChange={e => setAspectEmotion(e.target.value)}
                >
                  <option value="">None</option>
                  {SENTIMENTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={handleSaveLabel}
              className={`bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded hover:bg-blue-700 text-sm sm:text-base ${selectedWords.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={selectedWords.length === 0}
            >
              Save Label
            </button>
            <button onClick={handleClearSelection} className="border px-2 py-1 sm:px-3 rounded text-sm sm:text-base text-gray-700 dark:text-gray-200 dark:border-gray-600">Clear Selection</button>
            <button onClick={handleResetLabels} className="border px-2 py-1 sm:px-3 rounded text-sm sm:text-base text-red-600 dark:border-gray-600 dark:text-red-400">Reset</button>
          </div>
          {/* Label Descriptions */}
          <div className="p-1 sm:p-2 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700 w-full overflow-x-auto">
            <strong className="dark:text-gray-100 text-sm sm:text-base">Label Descriptions:</strong>
            <ul className="text-sm pl-4 list-disc space-y-1 mt-1 dark:text-gray-200">
              {SRL_ROLES.map(role => {
                const badgeColors: Record<string, string> = {
                  ASPECT: "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100",
                  OPINION: "bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100",
                  HOLDER: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100",
                  MODALITY: "bg-orange-200 text-orange-900 dark:bg-orange-700 dark:text-orange-100",
                };
                return (
                  <li key={role.value} className="flex items-center gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 font-bold text-sm ${badgeColors[role.value]}`}>{role.label}</span>
                    <span>{role.desc}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        {/* Right Column: Current Labels */}
        <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded shadow p-1 sm:p-2 flex flex-col gap-1 sm:gap-2 min-w-[180px] sm:min-w-[220px] max-h-[40vh] md:max-h-[90vh] overflow-y-auto mt-2 md:mt-0 text-base" style={{ fontFamily: `'Noto Sans', Arial, Helvetica, sans-serif` }}>
          <h2 className="font-semibold mb-1 sm:mb-2 dark:text-gray-100 text-sm sm:text-base">Current Labels</h2>
          <div className="flex flex-col gap-1">
            {(labels[currentIdx] || []).length === 0 ? (
              <div className="text-gray-400 italic dark:text-gray-500">No labels yet.</div>
            ) : (
              (labels[currentIdx] || []).map((label, idx) => (
                <div key={idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                  <span className="text-sm bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 dark:text-gray-100" style={{ fontFamily: `'Noto Sans', Arial, Helvetica, sans-serif` }}>
                    {label.text}
                  </span>
                  <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 font-semibold">
                    {label.role}
                  </span>
                  {/* Show emotion badge if ASPECT and has emotion */}
                  {label.role === "ASPECT" && label.emotion && (() => {
                    const s = SENTIMENTS.find(s => s.value === label.emotion);
                    return s ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
                    ) : null;
                  })()}
                  {/* Show aspect category badge if ASPECT and has category */}
                  {label.role === "ASPECT" && label.aspectCategory && (() => {
                    const cat = ASPECT_CATEGORIES.find(c => c.value === label.aspectCategory);
                    return cat ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100">{cat.label}</span>
                    ) : null;
                  })()}
                  <button
                    className="ml-2 text-sm text-red-500 hover:underline dark:text-red-400"
                    onClick={() => handleRemoveLabel(idx)}
                    title="Remove label"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
