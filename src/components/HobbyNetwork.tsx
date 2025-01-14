import React, { useEffect, useRef, useState, useCallback } from "react";
import "./HobbyNetwork.css";

// 定数の型定義
type Food =
  | "和食"
  | "中華"
  | "イタリアン"
  | "エスニック"
  | "焼肉"
  | "スイーツ"
  | "ラーメン"
  | "カレー";
type Lifestyle = "朝型" | "夜型" | "不規則";
type OutdoorIndoor = "アウトドア" | "インドア" | "バランス型";
type EatingHabit = "小食" | "普通" | "大食い";

// 属性の型定義
interface Attributes {
  games: string[];
  anime: string[];
  manga: string[];
  foods: Food[];
  lifestyle: Lifestyle;
  outdoorIndoor: OutdoorIndoor;
  eatingHabits: EatingHabit;
}

// ノードの型定義
interface Node {
  id: number;
  name: string;
  attributes: Attributes;
  x?: number;
  y?: number;
  z?: number;
  originalZ?: number;
}

// リンクの型定義
interface Link {
  source: Node;
  target: Node;
  value: number;
}

// カテゴリーの型定義
type Category = keyof Attributes | "all";

// hobbies.jsonからデータを読み込む
import hobbiesData from '../data/hobbies.json';

// データを型安全に変換
const validateFood = (food: string): Food => {
  const validFoods = ["和食", "中華", "イタリアン", "エスニック", "焼肉", "スイーツ", "ラーメン", "カレー"] as const;
  if (!validFoods.includes(food as typeof validFoods[number])) {
    throw new Error(`Invalid food: ${food}`);
  }
  return food as Food;
};

const validateLifestyle = (lifestyle: string): Lifestyle => {
  const validLifestyles = ["朝型", "夜型", "不規則"] as const;
  if (!validLifestyles.includes(lifestyle as typeof validLifestyles[number])) {
    throw new Error(`Invalid lifestyle: ${lifestyle}`);
  }
  return lifestyle as Lifestyle;
};

const validateOutdoorIndoor = (value: string): OutdoorIndoor => {
  const validValues = ["アウトドア", "インドア", "バランス型"] as const;
  if (!validValues.includes(value as typeof validValues[number])) {
    throw new Error(`Invalid outdoorIndoor: ${value}`);
  }
  return value as OutdoorIndoor;
};

const validateEatingHabit = (habit: string): EatingHabit => {
  const validHabits = ["小食", "普通", "大食い"] as const;
  if (!validHabits.includes(habit as typeof validHabits[number])) {
    throw new Error(`Invalid eatingHabit: ${habit}`);
  }
  return habit as EatingHabit;
};

// カテゴリの定義
const categories: Record<Category, string> = {
  all: "全体の相性",
  games: "ゲームの趣味",
  anime: "アニメの趣味",
  manga: "漫画の趣味",
  foods: "好きな料理",
  lifestyle: "生活リズム",
  outdoorIndoor: "アウトドア/インドア",
  eatingHabits: "食事の量",
};

// ノードデータをhobbies.jsonから読み込み、型を変換
const nodeData: Node[] = hobbiesData.nodes.map(node => ({
  ...node,
  attributes: {
    ...node.attributes,
    foods: node.attributes.foods.map(validateFood),
    lifestyle: validateLifestyle(node.attributes.lifestyle),
    outdoorIndoor: validateOutdoorIndoor(node.attributes.outdoorIndoor),
    eatingHabits: validateEatingHabit(node.attributes.eatingHabits)
  }
}));

const HobbyNetwork: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [rotation, setRotation] = useState<number>(0);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );

  // 関連度の計算
  const calculateSimilarity = (
    attr1: Attributes,
    attr2: Attributes,
    category: Category
  ): number => {
    if (category === "all") {
      let totalSimilarity = 0;
      // 配列属性の類似度計算
      (["games", "anime", "manga", "foods"] as const).forEach((cat) => {
        const attr1Array = attr1[cat];
        const attr2Array = attr2[cat];
        const common = (attr1Array as string[]).filter((item) =>
          (attr2Array as string[]).includes(item)
        ).length;
        const max = Math.max(attr1Array.length, attr2Array.length);
        totalSimilarity += common / max;
      });

      // 単一値属性の類似度計算
      (["lifestyle", "outdoorIndoor", "eatingHabits"] as const).forEach(
        (cat) => {
          if (attr1[cat] === attr2[cat]) totalSimilarity += 1;
        }
      );

      return totalSimilarity / 7; // 7つの属性で正規化
    } else if (["games", "anime", "manga", "foods"].includes(category)) {
      const attr1Array = attr1[category];
      const attr2Array = attr2[category];
      const common = (attr1Array as string[]).filter((item) =>
        (attr2Array as string[]).includes(item)
      ).length;
      const max = Math.max(attr1Array.length, attr2Array.length);
      return common / max;
    } else {
      return attr1[category] === attr2[category] ? 1 : 0;
    }
  };

  // 関連度行列の計算
  const calculateRelationMatrix = (): number[][] => {
    const matrix = Array(nodeData.length)
      .fill(0)
      .map(() => Array(nodeData.length).fill(0));

    for (let i = 0; i < nodeData.length; i++) {
      for (let j = i + 1; j < nodeData.length; j++) {
        const similarity = calculateSimilarity(
          nodeData[i].attributes,
          nodeData[j].attributes,
          selectedCategory
        );
        matrix[i][j] = matrix[j][i] = similarity;
      }
    }
    return matrix;
  };

  // リンクの計算
  const calculateLinks = (nodes: Node[]): Link[] => {
    const links: Link[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = calculateSimilarity(
          nodes[i].attributes,
          nodes[j].attributes,
          selectedCategory
        );

        if (similarity > 0) {
          links.push({
            source: nodes[i],
            target: nodes[j],
            value: similarity,
          });
        }
      }
    }
    return links;
  };

  // 関連性の強さに基づいて色を計算
  const getRelationColor = (value: number): string => {
    const normalizedValue = value;
    const hue = Math.max(0, Math.min(270, (1 - normalizedValue) * 270));
    const saturation = 100;
    const lightness = 50;

    const c = ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness / 100 - c / 2;

    let r: number, g: number, b: number;
    if (hue >= 0 && hue < 60) {
      [r, g, b] = [c, x, 0];
    } else if (hue >= 60 && hue < 120) {
      [r, g, b] = [x, c, 0];
    } else if (hue >= 120 && hue < 180) {
      [r, g, b] = [0, c, x];
    } else if (hue >= 180 && hue < 240) {
      [r, g, b] = [0, x, c];
    } else {
      [r, g, b] = [x, 0, c];
    }

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return `rgb(${red}, ${green}, ${blue})`;
  };

  // 3D→2D投影の変換
  const project3DTo2D = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number
  ) => {
    const fov = 1000;
    const viewZ = 1000;
    const scale = fov / (viewZ + z);
    const projectedX = x * scale + width / 2;
    const projectedY = y * scale + height / 2;

    return {
      x: projectedX,
      y: projectedY,
      scale: scale,
    };
  };

  // 3D空間でのノード配置を最適化
  const optimizeNodePositions = (width: number, height: number): Node[] => {
    const relationMatrix = calculateRelationMatrix();
    const radius = Math.min(width, height) * 0.4;
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;

    const totalRelations = relationMatrix.map((row) =>
      row.reduce((sum, val) => sum + val, 0)
    );

    const orderedNodes = totalRelations
      .map((total, index) => ({ index, total }))
      .sort((a, b) => b.total - a.total);

    const positions: Array<{ index: number; x: number; y: number; z: number }> =
      [];

    // 最初のノードを中心に配置
    positions.push({
      index: orderedNodes[0].index,
      x: centerX,
      y: centerY,
      z: centerZ,
    });

    // フィボナッチ球面分布を使用して残りのノードを配置
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 1; i < orderedNodes.length; i++) {
      const currentNode = orderedNodes[i];

      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / orderedNodes.length);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push({
        index: currentNode.index,
        x,
        y,
        z,
      });
    }

    // 最終的なノードの位置を計算（回転も適用）
    const nodes = positions.map((pos) => {
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      const rotatedX = pos.x * cosRot - pos.z * sinRot;
      const rotatedZ = pos.x * sinRot + pos.z * cosRot;

      return {
        ...nodeData[pos.index],
        x: rotatedX,
        y: pos.y,
        z: rotatedZ,
        originalZ: rotatedZ,
      };
    });

    return nodes.sort((a, b) => b.z - a.z);
  };

  // マウス位置の更新
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setMousePos({ x, y });

    // エッジとの交差判定
    const width = canvas.width;
    const height = canvas.height;
    const nodes = optimizeNodePositions(width, height);
    const links = calculateLinks(nodes);

    let hoveredLinkFound = null;
    for (const link of links) {
      const sourceProj = project3DTo2D(
        link.source.x!,
        link.source.y!,
        link.source.z!,
        width,
        height
      );
      const targetProj = project3DTo2D(
        link.target.x!,
        link.target.y!,
        link.target.z!,
        width,
        height
      );

      const distance = distanceToLine(
        x * (width / rect.width),
        y * (height / rect.height),
        sourceProj.x,
        sourceProj.y,
        targetProj.x,
        targetProj.y
      );

      if (distance < 5) {
        hoveredLinkFound = link;
        break;
      }
    }
    setHoveredLink(hoveredLinkFound);
  };

  // ノードクリックの処理
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;

    const nodes = optimizeNodePositions(width, height);
    for (const node of nodes) {
      const proj = project3DTo2D(node.x!, node.y!, node.z!, width, height);
      const nodeRadius = 20 * proj.scale;
      const dx = x * (width / rect.width) - proj.x;
      const dy = y * (height / rect.height) - proj.y;
      if (dx * dx + dy * dy <= nodeRadius * nodeRadius) {
        setSelectedNode(selectedNode?.id === node.id ? null : node);
        break;
      }
    }
  };

  // 点と線分の距離を計算
  const distanceToLine = (
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 共通する属性を取得
  const getCommonAttributes = (source: Node, target: Node): string[] => {
    const common: string[] = [];

    // 配列属性の比較
    ["games", "anime", "manga", "foods"].forEach((category) => {
      const sourceAttrs = source.attributes[
        category as keyof Attributes
      ] as string[];
      const targetAttrs = target.attributes[
        category as keyof Attributes
      ] as string[];
      const commonItems = sourceAttrs.filter((item) =>
        targetAttrs.includes(item)
      );
      if (commonItems.length > 0) {
        common.push(
          `${categories[category as Category]}: ${commonItems.join(", ")}`
        );
      }
    });

    // 単一値属性の比較
    ["lifestyle", "outdoorIndoor", "eatingHabits"].forEach((category) => {
      const sourceAttr = source.attributes[category as keyof Attributes];
      const targetAttr = target.attributes[category as keyof Attributes];
      if (sourceAttr === targetAttr) {
        common.push(`${categories[category as Category]}: ${sourceAttr}`);
      }
    });

    return common;
  };

  // グラフの描画
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 背景をクリア
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, height);

    const nodes = optimizeNodePositions(width, height);
    const links = calculateLinks(nodes);

    // リンクの描画
    links.forEach((link) => {
      const sourceProj = project3DTo2D(
        link.source.x!,
        link.source.y!,
        link.source.z!,
        width,
        height
      );
      const targetProj = project3DTo2D(
        link.target.x!,
        link.target.y!,
        link.target.z!,
        width,
        height
      );

      const avgZ = (link.source.z! + link.target.z!) / 2;
      const maxZ = Math.min(width, height) * 0.4;
      const opacity = Math.max(
        0.1,
        Math.min(0.8, 1 - (avgZ + maxZ) / (2 * maxZ))
      );

      ctx.beginPath();
      ctx.moveTo(sourceProj.x, sourceProj.y);
      ctx.lineTo(targetProj.x, targetProj.y);

      let strokeColor;
      if (link === hoveredLink) {
        strokeColor = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = Math.max(1, 3 * sourceProj.scale);
      } else {
        const color = getRelationColor(link.value);
        strokeColor = color
          .replace("rgb", "rgba")
          .replace(")", `, ${opacity})`);
        ctx.lineWidth = Math.max(0.5, 2 * sourceProj.scale);
      }
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    });

    // ノードの描画
    nodes.forEach((node) => {
      const proj = project3DTo2D(node.x!, node.y!, node.z!, width, height);
      const nodeRadius = 20 * proj.scale;
      const fontSize = Math.max(8, 12 * proj.scale);

      const maxZ = Math.min(width, height) * 0.4;
      const opacity = Math.max(
        0.3,
        Math.min(1, 1 - (node.z! + maxZ) / (2 * maxZ))
      );

      const isSelected = selectedNode?.id === node.id;
      const isConnected =
        selectedNode &&
        links.some(
          (link) =>
            (link.source.id === selectedNode.id &&
              link.target.id === node.id) ||
            (link.target.id === selectedNode.id && link.source.id === node.id)
        );

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(31, 41, 55, ${opacity})`;
      ctx.fill();

      if (isSelected || isConnected) {
        ctx.lineWidth = 5;  // 輪郭を太く
        ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`; // 紫色
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`; // 通常時は青色
      }
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.name, proj.x, proj.y);

      if (
        selectedCategory !== "all" &&
        selectedCategory !== "lifestyle" &&
        selectedCategory !== "outdoorIndoor" &&
        selectedCategory !== "eatingHabits"
      ) {
        const attrs = node.attributes[selectedCategory].join(", ");
        ctx.font = `${fontSize * 0.8}px Arial`;
        ctx.fillText(attrs, proj.x, proj.y + nodeRadius + 5);
      } else if (selectedCategory !== "all") {
        ctx.font = `${fontSize * 0.8}px Arial`;
        ctx.fillText(
          node.attributes[selectedCategory],
          proj.x,
          proj.y + nodeRadius + 5
        );
      }
    });

    // ツールチップの描画
    if (hoveredLink && mousePos) {
      const commonAttrs = getCommonAttributes(
        hoveredLink.source,
        hoveredLink.target
      );
      if (commonAttrs.length > 0) {
        ctx.save();

        // ツールチップの背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";

        const padding = 10;
        const lineHeight = 20;
        const tooltipWidth = 300;
        const tooltipHeight =
          (commonAttrs.length + 1) * lineHeight + padding * 2;

        let tooltipX =
          mousePos.x * (width / canvas.getBoundingClientRect().width);
        let tooltipY =
          mousePos.y * (height / canvas.getBoundingClientRect().height);

        // ツールチップが画面外にはみ出ないように調整
        if (tooltipX + tooltipWidth > width) {
          tooltipX = width - tooltipWidth - padding;
        }
        if (tooltipY + tooltipHeight > height) {
          tooltipY = height - tooltipHeight - padding;
        }

        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);
        ctx.fill();
        ctx.stroke();

        // テキストの描画
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        ctx.fillText(
          `${hoveredLink.source.name} と ${hoveredLink.target.name} の共通点:`,
          tooltipX + padding,
          tooltipY + padding
        );

        commonAttrs.forEach((attr, index) => {
          ctx.fillText(
            attr,
            tooltipX + padding,
            tooltipY + padding + (index + 1) * lineHeight
          );
        });

        ctx.restore();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    rotation,
    hoveredLink,
    mousePos,
    selectedNode,
    project3DTo2D,
    optimizeNodePositions,
    calculateLinks,
    getRelationColor,
    getCommonAttributes,
  ]);

  // アニメーションの更新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateAnimation = () => {
    setRotation((prev) => (prev + 0.002) % (Math.PI * 2));
    animationRef.current = requestAnimationFrame(updateAnimation);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateAnimation);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateAnimation]);

  useEffect(() => {
    drawGraph();
  }, [
    selectedCategory,
    rotation,
    hoveredLink,
    mousePos,
    selectedNode,
    drawGraph,
  ]);

  return (
    <div className="hobby-network-card">
      <div className="hobby-network-header">
        <h2 className="hobby-network-title">3D趣味・属性ネットワーク図</h2>
      </div>
      <div className="hobby-network-content">
        <div className="category-select-container">
          <select
            className="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category)}
          >
            {Object.entries(categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="network-canvas"
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onMouseLeave={() => {
              setHoveredLink(null);
              setMousePos(null);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HobbyNetwork;
