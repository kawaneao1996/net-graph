import React, { useEffect, useRef, useState } from 'react';
import './HobbyNetwork.css';

// 定数の型定義
type Food = "和食" | "中華" | "イタリアン" | "エスニック" | "焼肉" | "スイーツ" | "ラーメン" | "カレー";
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
type Category = keyof Attributes | 'all';

// 属性の定義
const FOODS: Food[] = ["和食", "中華", "イタリアン", "エスニック", "焼肉", "スイーツ", "ラーメン", "カレー"];
const LIFESTYLE: Lifestyle[] = ["朝型", "夜型", "不規則"];
const OUTDOOR_INDOOR: OutdoorIndoor[] = ["アウトドア", "インドア", "バランス型"];
const EATING_HABITS: EatingHabit[] = ["小食", "普通", "大食い"];

const createRandomAttributes = (): Attributes => {
  return {
    games: ["ゼルダ", "FF14", "原神", "ポケモン", "スプラトゥーン", "モンハン"]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 2)),
    anime: ["鬼滅の刃", "SPY×FAMILY", "推しの子", "チェンソーマン", "進撃の巨人", "ブルーロック"]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 2)),
    manga: ["ワンピース", "チェンソーマン", "ブルーロック", "呪術廻戦", "キングダム", "葬送のフリーレン"]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 2)),
    foods: FOODS
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2)) as Food[],
    lifestyle: LIFESTYLE[Math.floor(Math.random() * LIFESTYLE.length)],
    outdoorIndoor: OUTDOOR_INDOOR[Math.floor(Math.random() * OUTDOOR_INDOOR.length)],
    eatingHabits: EATING_HABITS[Math.floor(Math.random() * EATING_HABITS.length)]
  };
};

// カテゴリの定義
const categories: Record<Category, string> = {
  all: '全体の相性',
  games: 'ゲームの趣味',
  anime: 'アニメの趣味',
  manga: '漫画の趣味',
  foods: '好きな料理',
  lifestyle: '生活リズム',
  outdoorIndoor: 'アウトドア/インドア',
  eatingHabits: '食事の量'
};

// ノードデータの生成
const nodeData: Node[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: [
    "田中", "佐藤", "鈴木", "山田", "伊藤", "渡辺", "加藤", "吉田", "山本", "中村",
    "小林", "斎藤", "高橋", "森", "池田", "橋本", "木村", "林", "清水", "山口",
    "村上", "近藤", "石川", "前田", "藤田", "後藤", "遠藤", "青木", "坂本", "久保",
    "松本", "井上", "野口", "菅原", "新井", "小川", "岡田", "原田", "荒木", "横山"
  ][i],
  attributes: createRandomAttributes()
}));

const HobbyNetwork: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [rotation, setRotation] = useState<number>(0);

  // 関連度の計算
  const calculateSimilarity = (attr1: Attributes, attr2: Attributes, category: Category): number => {
    if (category === 'all') {
      let totalSimilarity = 0;
      // 配列属性の類似度計算
      (['games', 'anime', 'manga', 'foods'] as const).forEach(cat => {
        const attr1Array = attr1[cat];
        const attr2Array = attr2[cat];
        const common = (attr1Array as string[]).filter(item => 
          (attr2Array as string[]).includes(item)
        ).length;
        const max = Math.max(attr1Array.length, attr2Array.length);
        totalSimilarity += common / max;
      });
      
      // 単一値属性の類似度計算
      (['lifestyle', 'outdoorIndoor', 'eatingHabits'] as const).forEach(cat => {
        if (attr1[cat] === attr2[cat]) totalSimilarity += 1;
      });
      
      return totalSimilarity / 7; // 7つの属性で正規化
    } else if (['games', 'anime', 'manga', 'foods'].includes(category)) {
      const attr1Array = attr1[category];
      const attr2Array = attr2[category];
      const common = (attr1Array as string[]).filter(item => 
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
    const matrix = Array(nodeData.length).fill(0).map(() => Array(nodeData.length).fill(0));
    
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
            value: similarity
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
    
    const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
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
  const project3DTo2D = (x: number, y: number, z: number, width: number, height: number) => {
    const fov = 1000;
    const viewZ = 1000;
    const scale = fov / (viewZ + z);
    const projectedX = (x * scale) + width / 2;
    const projectedY = (y * scale) + height / 2;
    
    return {
      x: projectedX,
      y: projectedY,
      scale: scale
    };
  };

  // 3D空間でのノード配置を最適化
  const optimizeNodePositions = (width: number, height: number): Node[] => {
    const relationMatrix = calculateRelationMatrix();
    const radius = Math.min(width, height) * 0.4;
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;
    
    const totalRelations = relationMatrix.map(row => 
      row.reduce((sum, val) => sum + val, 0)
    );
    
    const orderedNodes = totalRelations
      .map((total, index) => ({ index, total }))
      .sort((a, b) => b.total - a.total);
    
    const positions: Array<{ index: number; x: number; y: number; z: number }> = [];
    
    // 最初のノードを中心に配置
    positions.push({
      index: orderedNodes[0].index,
      x: centerX,
      y: centerY,
      z: centerZ
    });
    
    // フィボナッチ球面分布を使用して残りのノードを配置
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 1; i < orderedNodes.length; i++) {
      const currentNode = orderedNodes[i];
      
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / orderedNodes.length);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions.push({
        index: currentNode.index,
        x, y, z
      });
    }
    
    // 最終的なノードの位置を計算（回転も適用）
    const nodes = positions.map(pos => {
      const cosRot = Math.cos(rotation);
      const sinRot = Math.sin(rotation);
      const rotatedX = pos.x * cosRot - pos.z * sinRot;
      const rotatedZ = pos.x * sinRot + pos.z * cosRot;
      
      return {
        ...nodeData[pos.index],
        x: rotatedX,
        y: pos.y,
        z: rotatedZ,
        originalZ: rotatedZ
      };
    });
    
    return nodes.sort((a, b) => b.z - a.z);
  };

  // グラフの描画
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 背景をクリア
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    const nodes = optimizeNodePositions(width, height);
    const links = calculateLinks(nodes);

    // リンクの描画
    links.forEach(link => {
      const sourceProj = project3DTo2D(link.source.x!, link.source.y!, link.source.z!, width, height);
      const targetProj = project3DTo2D(link.target.x!, link.target.y!, link.target.z!, width, height);
      
      const avgZ = (link.source.z! + link.target.z!) / 2;
      const maxZ = Math.min(width, height) * 0.4;
      const opacity = Math.max(0.1, Math.min(0.8, 1 - (avgZ + maxZ) / (2 * maxZ)));
      
      ctx.beginPath();
      ctx.moveTo(sourceProj.x, sourceProj.y);
      ctx.lineTo(targetProj.x, targetProj.y);
      const color = getRelationColor(link.value);
      const rgbaColor = color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
      ctx.strokeStyle = rgbaColor;
      ctx.lineWidth = Math.max(0.5, 2 * sourceProj.scale);
      ctx.stroke();
    });

    // ノードの描画
    nodes.forEach(node => {
      const proj = project3DTo2D(node.x!, node.y!, node.z!, width, height);
      const nodeRadius = 20 * proj.scale;
      const fontSize = Math.max(8, 12 * proj.scale);
      
      const maxZ = Math.min(width, height) * 0.4;
      const opacity = Math.max(0.3, Math.min(1, 1 - (node.z! + maxZ) / (2 * maxZ)));
      
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(31, 41, 55, ${opacity})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, proj.x, proj.y);

      if (selectedCategory !== 'all' && selectedCategory !== 'lifestyle' && 
          selectedCategory !== 'outdoorIndoor' && selectedCategory !== 'eatingHabits') {
        const attrs = node.attributes[selectedCategory].join(', ');
        ctx.font = `${fontSize * 0.8}px Arial`;
        ctx.fillText(attrs, proj.x, proj.y + nodeRadius + 5);
      } else if (selectedCategory !== 'all') {
        ctx.font = `${fontSize * 0.8}px Arial`;
        ctx.fillText(node.attributes[selectedCategory], proj.x, proj.y + nodeRadius + 5);
      }
    });
  };

  // アニメーションの更新
  const updateAnimation = () => {
    setRotation(prev => (prev + 0.002) % (Math.PI * 2));
    animationRef.current = requestAnimationFrame(updateAnimation);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateAnimation);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    drawGraph();
  }, [selectedCategory, rotation]);

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
          />
        </div>
      </div>
    </div>
  );
};

export default HobbyNetwork;
