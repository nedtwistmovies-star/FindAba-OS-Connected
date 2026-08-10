import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Bot, ImageIcon, Video, Send, 
  Plus, Share2, Heart, MessageCircle, 
  Play, Pause, Volume2, VolumeX, ChevronRight, ChevronLeft,
  ShieldCheck, AlertTriangle, MapPin, Building2, Eye, Calendar, 
  User, Sparkles, ArrowLeft, Loader2, Camera, X, ExternalLink,
  Bookmark, CheckCircle2, RefreshCw, Film, Maximize2, Layers
} from 'lucide-react';
import { Advertorial, Post, ViewState } from '../../types';
import { 
  getAdvertorials, 
  createAdvertorial 
} from '../../services/supabaseService';
import { fetchPosts } from '../../services/facesService';
import { generateAdvertorial } from '../../services/geminiService';
import { IndustrialButton, SectionHeader } from '../../components';
import { useBusiness } from '../../providers/BusinessProvider';
import { useToast } from '../../providers/ToastProvider';

interface Props {
  onBack?: () => void;
  setView?: (v: ViewState) => void;
  onPostClick?: (p: Advertorial & { grounding?: any[] }) => void;
}

export interface AbaStory {
  id: string;
  title: string;
  type: 'video_documentary' | 'pictorial_story' | 'community_extracted';
  author_name: string;
  author_role?: string;
  location?: string;
  media_url: string;
  media_type: 'video' | 'image';
  thumbnail_url?: string;
  duration?: string;
  description: string;
  business_id?: string;
  business_name?: string;
  category: string;
  likes_count: number;
  views_count: number;
  created_at: string;
  full_story?: string;
  is_verified?: boolean;
}

const SEEDED_ABA_STORIES: AbaStory[] = [
  {
    id: 'story-doc-1',
    title: 'The Master Shoemakers of Ariaria: Crafting West Africa’s Footwear',
    type: 'video_documentary',
    author_name: 'Mazi Nnamdi Kalu',
    author_role: 'Master Craftsman & Leather Guild Leader',
    location: 'Ariaria International Market, Zone B',
    media_url: 'https://assets.mixkit.co/videos/preview/mixkit-blacksmith-working-on-a-piece-of-metal-41005-large.mp4',
    media_type: 'video',
    thumbnail_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200',
    duration: '04:45',
    description: 'Inside the humming workshops of Ariaria where over 80,000 artisans handcraft premium leather shoes, boots, and sandals exported across Africa and Europe.',
    category: 'Leather & Footwear',
    likes_count: 1420,
    views_count: 8940,
    created_at: '2026-08-01T10:00:00Z',
    is_verified: true,
    full_story: 'For over four decades, Ariaria International Market in Aba has stood as the undisputable shoe-making capital of West Africa. Every day, tons of high-grade raw leather arrive at the workshops. Craftsmen like Mazi Nnamdi utilize precision cutting tools, custom lasts, and heat-curing presses to turn raw hides into world-class footwear. With the FindAba digital registry, these artisans now secure international export compliance and digital trade verification.'
  },
  {
    id: 'story-doc-2',
    title: 'Ngwa Road Textile Revolution: Custom Garments & High Fashion',
    type: 'video_documentary',
    author_name: 'Chief Mrs. Adaora Okeke',
    author_role: 'Founder, Royale Garment Mills',
    location: 'Ngwa Road Fashion Cluster, Aba',
    media_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-tailor-working-with-a-sewing-machine-42861-large.mp4',
    media_type: 'video',
    thumbnail_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200',
    duration: '06:12',
    description: 'Witnessing high-speed embroidery machines and textile tailors weaving bespoke ceremonial attires, uniforms, and modern streetwear for global clientele.',
    category: 'Textile & Fashion',
    likes_count: 980,
    views_count: 6210,
    created_at: '2026-08-03T14:20:00Z',
    is_verified: true,
    full_story: 'From industrial sewing machines to hand-beaded lace, the Ngwa Road fashion ecosystem powers thousands of garment labels across Nigeria. In this documentary story, Chief Mrs. Adaora shares how her mill expanded from 2 pedal machines to a fully digitized 50-workstation factory servicing orders from Lagos, London, and Atlanta.'
  },
  {
    id: 'story-pic-1',
    title: 'Precision Metal Casting & Machine Fabrication in Osisioma',
    type: 'pictorial_story',
    author_name: 'Engr. Emeka Nwosu',
    author_role: 'Heavy Machinery Fabricator',
    location: 'Osisioma Industrial Zone, Aba',
    media_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200',
    media_type: 'image',
    description: 'A photo journey through the foundry fires, lathes, and CNC metal workshops of Osisioma where local engineers build food processing machines and vehicle spares from scratch.',
    category: 'Heavy Engineering',
    likes_count: 750,
    views_count: 4300,
    created_at: '2026-08-05T09:15:00Z',
    is_verified: true,
    full_story: 'Osisioma Industrial Zone represents the resilient backbone of Aba metallurgy. Local engineers cast iron, weld structural steel, and machine precision gears for palm oil mills, cassava processors, and heavy commercial vehicles. This photo story highlights the ingenuity of self-taught metallurgists turning scrap metal into industrial machinery.'
  },
  {
    id: 'story-pic-2',
    title: 'Voices of Ekeoha Shopping Center: Electronics & Innovation',
    type: 'pictorial_story',
    author_name: 'Grace Ibe',
    author_role: 'Tech Hardware Merchant',
    location: 'Ekeoha Shopping Center, Aba',
    media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200',
    media_type: 'image',
    description: 'Exploring Ekeoha market where young tech minds assemble solar power systems, repair micro-electronics, and trade mobile hardware accessories.',
    category: 'Tech & Hardware',
    likes_count: 1120,
    views_count: 7890,
    created_at: '2026-08-06T16:45:00Z',
    is_verified: true,
    full_story: 'Ekeoha Shopping Center is Aba’s premier tech trading exchange. Here, solar panel distributors, micro-chip repair technicians, and hardware importers collaborate to energize Eastern Nigeria’s digital economy.'
  }
];

export const AdvertorialFeed: React.FC<Props> = ({ onBack, setView, onPostClick }) => {
  const { setSelectedBusiness } = useBusiness();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'pictorial' | 'community'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stories, setStories] = useState<AbaStory[]>(SEEDED_ABA_STORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [extractedPosts, setExtractedPosts] = useState<Post[]>([]);

  // Selected Story Detail / Reel Viewer Modal
  const [activeReel, setActiveReel] = useState<AbaStory | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  const [bookmarkedStories, setBookmarkedStories] = useState<Record<string, boolean>>({});

  // AI Narrative Breakdown Modal
  const [aiStoryModal, setAiStoryModal] = useState<AbaStory | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Submit Story Modal
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newAuthor, setNewAuthor] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Leather & Footwear');
  const [newMediaUrl, setNewMediaUrl] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch Community Posts from Faces feed and extract video/image stories
  useEffect(() => {
    const loadCommunityData = async () => {
      setLoading(true);
      try {
        const postsData = await fetchPosts(30, 0);
        setExtractedPosts(postsData);

        // Convert community posts with media into AbaStory format
        const communityStories: AbaStory[] = postsData
          .filter((p) => p.media_url && p.media_url.trim().length > 0)
          .map((p) => {
            const isVid = p.media_type === 'video' || (p.media_url && (p.media_url.endsWith('.mp4') || p.media_url.includes('video')));
            const authorObj = p.author as any;
            return {
              id: `extracted-${p.id}`,
              title: p.content ? (p.content.slice(0, 60) + (p.content.length > 60 ? '...' : '')) : 'Community Story from Faces',
              type: 'community_extracted',
              author_name: authorObj?.full_name || authorObj?.username || 'Aba Citizen',
              author_role: authorObj?.business_name ? `Proprietor, ${authorObj.business_name}` : 'Aba Resident & Artisan',
              location: authorObj?.business_address || 'Aba, Abia State',
              media_url: p.media_url!,
              media_type: isVid ? 'video' : 'image',
              thumbnail_url: p.media_url,
              duration: isVid ? 'Reel' : undefined,
              description: p.content || 'Public post extracted automatically from Faces Social Mesh.',
              category: 'Community Post',
              likes_count: p.likes_count || 12,
              views_count: Math.floor(Math.random() * 300) + 150,
              created_at: p.created_at,
              is_verified: !!authorObj?.is_verified,
              full_story: p.content
            };
          });

        setStories([...SEEDED_ABA_STORIES, ...communityStories]);
      } catch (err) {
        console.warn("[AbaStories] Failed to load extracted community posts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCommunityData();
  }, []);

  // Filter stories based on active tab & category
  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      // Tab filter
      if (activeTab === 'video' && s.media_type !== 'video' && s.type !== 'video_documentary') return false;
      if (activeTab === 'pictorial' && s.type !== 'pictorial_story' && s.media_type !== 'image') return false;
      if (activeTab === 'community' && s.type !== 'community_extracted') return false;

      // Category filter
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;

      return true;
    });
  }, [stories, activeTab, selectedCategory]);

  const categories = ['All', 'Leather & Footwear', 'Textile & Fashion', 'Heavy Engineering', 'Tech & Hardware', 'Community Post'];

  const toggleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedStories((prev) => ({ ...prev, [id]: !prev[id] }));
    addToast(likedStories[id] ? "Salute removed" : "Saluted this Aba Story!", "info");
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedStories((prev) => ({ ...prev, [id]: !prev[id] }));
    addToast(bookmarkedStories[id] ? "Removed from saved stories" : "Saved story to your library", "success");
  };

  const handleOpenAiBreakdown = async (story: AbaStory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAiStoryModal(story);
    setAiAnalysis(null);
    setIsGeneratingAi(true);

    try {
      const topicPrompt = `Provide a rich 2-paragraph economic & cultural breakdown of this Aba Story: "${story.title}". Location: ${story.location || 'Aba'}. Context: ${story.description}`;
      const res = await generateAdvertorial(topicPrompt);
      setAiAnalysis(res.content || "Aba's industrial resilience powers millions of trades across West Africa. This story represents the foundational craft and community ingenuity of the city.");
    } catch (err) {
      setAiAnalysis("This story illustrates the deep craftsmanship and commercial momentum of Aba's local enterprises. Verified on the FindAba network.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmitStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMediaUrl.trim()) {
      addToast("Please provide a story title and valid media URL.", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const isVid = newMediaUrl.includes('.mp4') || newMediaUrl.includes('video');
      const created: AbaStory = {
        id: `user-story-${Date.now()}`,
        title: newTitle,
        type: isVid ? 'video_documentary' : 'pictorial_story',
        author_name: newAuthor || 'Aba Creator',
        author_role: 'Community Storyteller',
        location: newLocation || 'Aba Industrial Hub',
        media_url: newMediaUrl,
        media_type: isVid ? 'video' : 'image',
        description: newDescription || 'New story uploaded to Aba in Action.',
        category: newCategory,
        likes_count: 1,
        views_count: 10,
        created_at: new Date().toISOString(),
        is_verified: true,
      };

      setStories([created, ...stories]);
      setIsSubmitting(false);
      setShowSubmitModal(false);
      setNewTitle('');
      setNewMediaUrl('');
      setNewDescription('');
      addToast("Your Aba story has been published to Aba in Action!", "success");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      {/* 1. TOP STICKY BAR */}
      <div className="px-4 sm:px-8 py-5 bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-aba-gold animate-ping" />
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                Aba in <span className="text-aba-gold">Action.</span>
              </h2>
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
              Reels, Video Documentaries & Pictorial Stories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-aba-gold text-aba-deep rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Submit Story</span>
          </button>
        </div>
      </div>

      {/* 2. HERO STATEMENT & STATS BANNER */}
      <div className="px-4 sm:px-8 py-8 bg-gradient-to-b from-[#0f172a] to-[#020617] border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-aba-gold/10 border border-aba-gold/30 rounded-full text-aba-gold text-[9px] font-black uppercase tracking-widest">
              <Film size={12} />
              <span>Living Archive of Industrial Resilience</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Stories of <span className="text-aba-gold">Craft, Commerce & Culture</span>
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Explore long-form video documentaries, pictorial journeys, and auto-extracted community reels showcasing the artisans, innovators, and businesses transforming Aba.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-auto justify-around">
            <div className="text-center px-3">
              <p className="text-lg font-black text-aba-gold">{stories.length}</p>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Total Stories</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-3">
              <p className="text-lg font-black text-emerald-400">
                {stories.filter(s => s.media_type === 'video').length}
              </p>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Video Reels</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-3">
              <p className="text-lg font-black text-sky-400">{extractedPosts.length}</p>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Extracted Faces</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS & CATEGORY FILTER BAR */}
      <div className="px-4 sm:px-8 py-4 bg-[#020617] sticky top-[73px] z-30 border-b border-white/5 space-y-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          {/* Main Content Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            {[
              { id: 'all', label: 'All Stories', icon: Layers },
              { id: 'video', label: 'Video Reels & Docs', icon: Video },
              { id: 'pictorial', label: 'Pictorial Essays', icon: ImageIcon },
              { id: 'community', label: 'Faces Community Reels', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-aba-gold text-aba-deep shadow-md font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white/20 border-aba-gold text-aba-gold'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN STORIES GRID / REELS FEED */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-3xl h-80 animate-pulse p-6 flex flex-col justify-end space-y-3">
                <div className="h-6 bg-white/10 rounded-lg w-3/4" />
                <div className="h-4 bg-white/10 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-16 text-center bg-white/5 rounded-3xl border border-white/10 space-y-4 max-w-xl mx-auto my-12">
            <Video size={48} className="mx-auto text-aba-gold/40" />
            <h4 className="text-lg font-black uppercase tracking-wider text-white">No Stories Found</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              No video or pictorial stories match your selected filter. Try selecting "All Stories" or submit a new story!
            </p>
            <button
              onClick={() => { setActiveTab('all'); setSelectedCategory('All'); }}
              className="px-4 py-2 bg-aba-gold text-aba-deep font-black text-xs uppercase tracking-wider rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => {
              const isLiked = likedStories[story.id];
              const isBookmarked = bookmarkedStories[story.id];
              const isVideo = story.media_type === 'video' || story.type === 'video_documentary';

              return (
                <motion.div
                  key={story.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    setActiveReel(story);
                    setIsPlaying(true);
                  }}
                  className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group cursor-pointer hover:border-aba-gold/50 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-aba-gold/5"
                >
                  {/* Media Thumbnail Container */}
                  <div className="relative aspect-video sm:aspect-[16/10] bg-black overflow-hidden">
                    {isVideo ? (
                      <video
                        src={story.media_url}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md ${
                        story.type === 'community_extracted'
                          ? 'bg-sky-500/90 text-white'
                          : isVideo
                          ? 'bg-aba-gold text-aba-deep'
                          : 'bg-emerald-500 text-white'
                      }`}>
                        {story.type === 'community_extracted' ? (
                          <>
                            <Sparkles size={10} /> Extracted from Faces
                          </>
                        ) : isVideo ? (
                          <>
                            <Video size={10} /> Video Reel ({story.duration || 'Full Story'})
                          </>
                        ) : (
                          <>
                            <ImageIcon size={10} /> Pictorial Essay
                          </>
                        )}
                      </span>

                      {/* Bookmark Icon */}
                      <button
                        onClick={(e) => toggleBookmark(story.id, e)}
                        className={`p-2 rounded-full border backdrop-blur-md transition-all ${
                          isBookmarked 
                            ? 'bg-aba-gold text-aba-deep border-aba-gold' 
                            : 'bg-black/40 border-white/20 text-white/70 hover:text-white'
                        }`}
                      >
                        <Bookmark size={12} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Play Button Overlay for Videos */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-aba-gold/90 text-aba-deep rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-white transition-all">
                          <Play size={24} className="ml-1 fill-current" />
                        </div>
                      </div>
                    )}

                    {/* Author & Location Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/80">{story.author_name}</span>
                        {story.is_verified && (
                          <CheckCircle2 size={12} className="text-aba-gold" />
                        )}
                      </div>
                      {story.location && (
                        <p className="text-[9px] text-aba-gold flex items-center gap-1 uppercase tracking-wider font-bold">
                          <MapPin size={10} /> {story.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Story Text Info */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-white uppercase tracking-tight line-clamp-2 group-hover:text-aba-gold transition-colors">
                        {story.title}
                      </h4>
                      <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
                        {story.description}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => handleOpenAiBreakdown(story, e)}
                        className="text-[9px] font-black uppercase tracking-widest text-aba-gold flex items-center gap-1.5 hover:underline"
                      >
                        <Bot size={12} /> AI Narrative Analysis
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleLike(story.id, e)}
                          className={`flex items-center gap-1 text-[10px] font-bold ${
                            isLiked ? 'text-rose-400' : 'text-white/40 hover:text-white'
                          }`}
                        >
                          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                          <span>{story.likes_count + (isLiked ? 1 : 0)}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. FULLSCREEN REEL & DOCUMENTARY VIEWER MODAL */}
      <AnimatePresence>
        {activeReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6"
            onClick={() => setActiveReel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f172a] border border-white/10 rounded-none md:rounded-[2.5rem] w-full max-w-4xl max-h-screen md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveReel(null)}
                className="absolute top-4 right-4 z-50 p-3 bg-black/60 hover:bg-black text-white rounded-full border border-white/20 transition-all"
              >
                <X size={20} />
              </button>

              {/* Video / Image Stage */}
              <div className="w-full md:w-3/5 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                {activeReel.media_type === 'video' || activeReel.type === 'video_documentary' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={activeReel.media_url}
                      autoPlay={isPlaying}
                      muted={isMuted}
                      loop
                      playsInline
                      className="w-full h-full object-contain max-h-[70vh]"
                    />

                    {/* Media Controls Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white">
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            if (isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                            setIsPlaying(!isPlaying);
                          }
                        }}
                        className="p-1.5 hover:text-aba-gold"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>

                      <div className="text-[10px] font-mono text-white/70">
                        {activeReel.duration || 'Aba Reel'}
                      </div>

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 hover:text-aba-gold"
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={activeReel.media_url}
                    alt={activeReel.title}
                    className="w-full h-full object-contain max-h-[70vh]"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Story Details Panel */}
              <div className="w-full md:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6 bg-[#020617]/80">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-aba-gold/10 border border-aba-gold/30 rounded-full text-aba-gold text-[9px] font-black uppercase tracking-widest">
                    <Film size={12} />
                    <span>{activeReel.category}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-snug">
                    {activeReel.title}
                  </h3>

                  {/* Author Card */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-white">{activeReel.author_name}</p>
                      {activeReel.is_verified && <CheckCircle2 size={14} className="text-aba-gold" />}
                    </div>
                    {activeReel.author_role && (
                      <p className="text-[10px] text-white/50">{activeReel.author_role}</p>
                    )}
                    {activeReel.location && (
                      <p className="text-[9px] text-aba-gold uppercase tracking-wider font-bold mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {activeReel.location}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Story Summary</h5>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {activeReel.full_story || activeReel.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleOpenAiBreakdown(activeReel)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-aba-gold rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Bot size={16} />
                    <span>Generate AI Story Breakdown</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleLike(activeReel.id)}
                      className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        likedStories[activeReel.id]
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-white/5 border-white/10 text-white'
                      }`}
                    >
                      <Heart size={16} fill={likedStories[activeReel.id] ? 'currentColor' : 'none'} />
                      <span>Salute ({activeReel.likes_count + (likedStories[activeReel.id] ? 1 : 0)})</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        addToast("Story link copied to clipboard!", "success");
                      }}
                      className="p-3 bg-white/5 border border-white/10 text-white hover:text-aba-gold rounded-xl transition-all"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. AI STORY BREAKDOWN MODAL */}
      <AnimatePresence>
        {aiStoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setAiStoryModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setAiStoryModal(null)}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-aba-gold/10 text-aba-gold rounded-2xl border border-aba-gold/20">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">FindAba Oracle Story Analysis</h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{aiStoryModal.title}</p>
                </div>
              </div>

              {isGeneratingAi ? (
                <div className="p-12 text-center space-y-4">
                  <Loader2 size={36} className="mx-auto text-aba-gold animate-spin" />
                  <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                    Analyzing economic impact & industrial significance...
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-black/40 border border-white/5 rounded-2xl text-xs text-white/80 leading-relaxed space-y-3 font-mono">
                  <p>{aiAnalysis}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setAiStoryModal(null)}
                  className="px-6 py-2.5 bg-aba-gold text-aba-deep rounded-xl font-black text-xs uppercase tracking-wider"
                >
                  Close Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. SUBMIT STORY MODAL */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Submit an <span className="text-aba-gold">Aba Story</span>
                </h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Share video reels or pictorial journeys of Aba's creators and enterprises
                </p>
              </div>

              <form onSubmit={handleSubmitStory} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Story Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Revolutionizing Shoe Sole Molding in Ariaria"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Author / Business</label>
                    <input
                      type="text"
                      placeholder="e.g. Mazi Kalu"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                    >
                      <option value="Leather & Footwear">Leather & Footwear</option>
                      <option value="Textile & Fashion">Textile & Fashion</option>
                      <option value="Heavy Engineering">Heavy Engineering</option>
                      <option value="Tech & Hardware">Tech & Hardware</option>
                      <option value="Markets & Culture">Markets & Culture</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Location Cluster</label>
                  <input
                    type="text"
                    placeholder="e.g. Ariaria Market Zone A"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Media URL (Video or Image) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://... (mp4 video or high-res image)"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Story Description / Narrative</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the craft, technology, or trade story..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-aba-gold"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-3 bg-aba-gold text-aba-deep rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>Publish Story</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvertorialFeed;
