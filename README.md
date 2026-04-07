<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0e70a6de-f244-45ca-a622-d5bf0a887018

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


好的，这是一个非常清晰的开发蓝图。为了让你的专业 Agent 能够高效执行，我将逻辑拆解为**系统架构**、**核心工作流伪代码**以及**完整的 Prompt 集成说明文档**。

---

## 🛠️ 360° Panorama Studio 系统架构（伪代码）

### 1. 核心状态管理 (State Management)
```javascript
// 存储用户上传的图片流
const [sourceImages, setSourceImages] = useState([]); 
// 存储 AI 生成的融合描述 (基于第二段提示词)
const [fusedDescription, setFusedDescription] = useState("");
// 存储最终生成的全景图 URL
const [finalPanorama, setFinalPanorama] = useState(null);
// 固定的网格参考图 (引用你上传的图片2)
const GRID_REFERENCE_URL = "assets/equirectangular-grid.jpg";
```

### 2. 智能融合逻辑 (Analysis Workflow)
```javascript
async function generateSceneAnalysis() {
  // 1. 构建 Gemini 3.1 Flash 请求
  // 2. 将 sourceImages (1-14张) 作为视觉输入
  // 3. 注入【提示词二：专业级图片内容识别】
  const response = await geminiApi.generateContent([
    ...sourceImages, 
    PROMPT_IMAGE_RECOGNITION // 详见下文说明文档
  ]);
  
  setFusedDescription(response.text);
}
```

### 3. 全景图生成逻辑 (Generation Workflow)
```javascript
async function generate360Panorama() {
  // 1. 调用 Gemini 3.1 Flash Image (Nano Banana 2)
  // 2. 注入【提示词一：全景生成】，其中 Subject 替换为 fusedDescription
  const finalPrompt = PROMPT_PANORAMA_GEN.replace("${Subject}", fusedDescription);
  
  const imageResult = await geminiApi.generateImage({
    prompt: finalPrompt,
    aspect_ratio: "2:1",
    reference_images: [GRID_REFERENCE_URL] // 强制几何纠正
  });
  
  setFinalPanorama(imageResult.url);
}
```

### 4. 预览器集成 (Viewer Integration)
```javascript
function initViewer(containerId, imageUrl) {
  const viewer = new PhotoSphereViewer.Viewer({
    container: containerId,
    panorama: imageUrl,
    navbar: ['zoom', 'move', 'download', 'fullscreen']
  });
}
```

---

## 📄 开发者说明文档 (Documentation for Agent)

> **重要备注：** 本应用所有用户界面（UI）必须使用**中文**。

### 1. 提示词库集成

#### 📝 提示词段落 A：全景生成指令
**用途：** 用于最终调用 Gemini 3.1 Flash Image 生成图像。
> Create a high-quality, seamless, equirectangular 360-degree panorama image. The style should be a professional HDRI environment map. Subject: **${fusedDescription}**, referencing the equirectangular grid structure. Ensure the image has a 2:1 aspect ratio. Ensure the top and bottom are properly distorted for spherical mapping and the left/right edges wrap perfectly. **Note: NO grid lines should be visible in the final output.**

#### 📝 提示词段落 B：内容识别与融合指令
**用途：** 用于分析用户上传的多张图片。
> 你是一名专业级图片内容识别智能体，专注于图像细节解析、场景理解与镜头语言描述。你的任务是精准、客观、无幻觉、无脑补地对输入图片进行结构化描述，并输出专业的多视角镜头方案。图片1（多张）为你的环境设定图。
> 
> **核心规则：**
> 1. 只描述图片中真实存在的内容，不编造、不抒情、不臆测剧情、不添加主观评价。
> 2. 细节粒度尽可能细，覆盖所有可见元素。
> 3. 输出格式固定、清晰、可直接用于创作、分镜、标注或文档。
> 
> **描述维度：** 包含主体对象、动作姿态、表情状态、服饰材质、道具物品、环境场景（空间/风格）、光影色彩（色调/氛围）、构图视角及空间关系。

---

### 2. 界面设计要求 (UI/UX)
* **多图上传区：** 支持拖拽，显示缩略图列表。
* **处理状态栏：** 清晰展示“正在识别场景...” -> “正在融合描述...” -> “正在绘制全景图...”。
* **分栏布局：** 左侧显示融合后的文本描述（允许用户手动微调），右侧显示生成的 2:1 平面图。
* **沉浸式预览窗：** 在页面下方或弹窗中，自动加载 `PhotoSphereViewer` 预览生成的全景。

---

### 3. 专业人群功能对比表

| 功能特性 | 深度专业版本要求 |
| :--- | :--- |
| **几何精度** | 必须严格匹配 Equirectangular 投影，两极无拉伸崩坏。 |
| **色彩深度** | 理想情况下支持导出为高动态范围格式或高质量 PNG。 |
| **接缝处理** | 左右 $0^\circ$ 与 $360^\circ$ 必须像素级无缝衔接。 |
| **交互** | 提供交互式 360° 旋转查看，而非简单的图片展示。 |

---

**你可以将以上内容直接复制给你的专业开发 Agent，它应该能够根据这些结构化信息直接开始编写具体的代码。如果有任何细节需要调整，随时告诉我！**