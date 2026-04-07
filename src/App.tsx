import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Settings, Key, Maximize, Edit2, Trash2, Grid } from 'lucide-react';
import PhotoSphereViewerComponent from './components/PhotoSphereViewer';
import { cn } from './lib/utils';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export default function App() {
  const [hasKey, setHasKey] = useState(false);
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [gridImage, setGridImage] = useState<File | null>(null);
  const [fusedDescription, setFusedDescription] = useState("");
  const [finalPanorama, setFinalPanorama] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(!!process.env.GEMINI_API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 14); // Max 14 images
      setSourceImages(prev => [...prev, ...files].slice(0, 14));
    }
  };

  const removeImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (sourceImages.length === 0) return;
    setIsProcessing(true);
    
    try {
      // Step 1: Scene Analysis
      setStatus("正在识别场景...");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const parts: any[] = await Promise.all(sourceImages.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          inlineData: {
            data: base64.split(',')[1],
            mimeType: file.type
          }
        };
      }));

      parts.push({
        text: `基于输入图像的精准、客观、无幻觉、无脑补地对输入图片进行结构化描述`
      });

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts }
      });

      const description = analysisResponse.text || "";
      setFusedDescription(description);

      // Step 2: Panorama Generation
      setStatus("正在绘制全景图...");
      const userAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Create a high-quality, seamless, equirectangular 360-degree panorama image. 
The style should be a professional HDRI environment map. 
Subject: ${description}, referencing the equirectangular grid structure. 
Ensure the image has a 2:1 aspect ratio.
Ensure the top and bottom are properly distorted for spherical mapping and the left/right edges wrap perfectly.
最终输出图片不要有网格线`;

      const generationParts: any[] = [{ text: prompt }];
      
      if (gridImage) {
        const gridBase64 = await fileToBase64(gridImage);
        generationParts.push({
          inlineData: {
            data: gridBase64.split(',')[1],
            mimeType: gridImage.type
          }
        });
      }

      const imageResponse = await userAi.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: generationParts
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: imageSize
          }
        }
      });

      let generatedUrl = null;
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          generatedUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }

      if (generatedUrl) {
        setFinalPanorama(generatedUrl);
        setStatus("生成完成！");
      } else {
        throw new Error("未能生成图片");
      }

    } catch (error) {
      console.error(error);
      setStatus("处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!finalPanorama || !editPrompt) return;
    setIsEditing(true);
    setStatus("正在编辑全景图...");
    
    try {
      const userAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const base64Data = finalPanorama.split(',')[1];
      const mimeType = finalPanorama.split(';')[0].split(':')[1];

      const response = await userAi.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: editPrompt,
            },
          ],
        },
      });

      let editedUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          editedUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }

      if (editedUrl) {
        setFinalPanorama(editedUrl);
        setStatus("编辑完成！");
        setEditPrompt("");
      } else {
        throw new Error("未能编辑图片");
      }
    } catch (error) {
      console.error(error);
      setStatus("编辑失败");
    } finally {
      setIsEditing(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <Key className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">配置 API Key</h1>
            <p className="text-zinc-400 text-sm">
              使用专业级图像生成模型 (Gemini 3 Pro Image) 需要您提供自己的 Google Cloud API Key。请确保您的项目已启用计费。
            </p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            选择 API Key
          </button>
          <p className="text-xs text-zinc-500">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
              了解计费详情
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">360° Panorama Studio</h1>
            <p className="text-zinc-400 mt-1">专业级全景环境贴图生成器</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
            >
              <option value="1K">1K 分辨率</option>
              <option value="2K">2K 分辨率</option>
              <option value="4K">4K 分辨率</option>
            </select>
            <button
              onClick={handleGenerate}
              disabled={isProcessing || sourceImages.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              {isProcessing ? '处理中...' : '开始分析与生成'}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Upload & Description */}
          <div className="space-y-6">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                环境参考图 (1-14张)
              </h2>
              <div 
                className="border-2 border-dashed border-zinc-700 hover:border-blue-500 transition-colors rounded-xl p-8 text-center cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">点击或拖拽图片至此处</p>
              </div>
              
              {sourceImages.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {sourceImages.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 group">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 bg-black/60 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Grid className="w-5 h-5 text-orange-400" />
                网格参考图 (用于几何纠正)
              </h2>
              {gridImage ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-800 group">
                  <img src={URL.createObjectURL(gridImage)} alt="Grid" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setGridImage(null)}
                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-zinc-700 hover:border-orange-500 transition-colors rounded-xl p-8 text-center cursor-pointer"
                  onClick={() => document.getElementById('grid-upload')?.click()}
                >
                  <input 
                    id="grid-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setGridImage(e.target.files[0]);
                      }
                    }} 
                  />
                  <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">点击或拖拽网格图至此处</p>
                </div>
              )}
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[300px]">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                场景融合描述 (可手动微调)
              </h2>
              <textarea
                value={fusedDescription}
                onChange={(e) => setFusedDescription(e.target.value)}
                placeholder="AI 将在此处生成场景描述，您也可以手动输入..."
                className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </section>
          </div>

          {/* Right Column: Generated Image & Status */}
          <div className="space-y-6">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  生成的平面图
                </h2>
                {status && (
                  <span className="text-sm px-3 py-1 bg-zinc-800 rounded-full text-zinc-300 flex items-center gap-2">
                    {(isProcessing || isEditing) && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status}
                  </span>
                )}
              </div>
              
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[300px]">
                {finalPanorama ? (
                  <img src={finalPanorama} alt="Generated Panorama" className="w-full h-full object-contain" />
                ) : (
                  <p className="text-zinc-600 text-sm">暂无生成的全景图</p>
                )}
              </div>

              {/* Edit Section */}
              {finalPanorama && (
                <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-3">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="输入提示词修改全景图 (例如: '添加一轮明月')..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                  />
                  <button
                    onClick={handleEdit}
                    disabled={isEditing || !editPrompt}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                    修改
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Bottom: 360 Viewer */}
        {finalPanorama && (
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Maximize className="w-5 h-5 text-orange-400" />
              沉浸式 360° 预览
            </h2>
            <PhotoSphereViewerComponent src={finalPanorama} />
          </section>
        )}
      </div>
    </div>
  );
}
