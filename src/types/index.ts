
export type ViewState = 
  | 'discover' | 'home' | 'oracle' | 'cargo' | 'profile' | 'detail' 
  | 'explore' | 'messages' | 'merchant-portal' 
  | 'register' | 'admin' | 'tech-setup' | 'buyer-portal' | 'ad-manager' 
  | 'pricing' | 'ad-checkout' | 'about' | 'aba-stories' | 'reels'
  /* 🔹 COMPATIBILITY KEYS (DEPRECATED - REMOVE FROM CALLERS) */
  | 'about-who' | 'about-vision' | 'about-mission' | 'about-aba'
  | 'faces' | 'fidelity' | 'thrift-dashboard' | 'wallet' | 'purple-fleet' | 'contact'
  | 'editorial' | 'editorial-detail' | 'registry-setup' | 'srts-office'
  | 'booking-ledger' | 'hotel-detail' | 'hotel-partner-control'
  | 'carry-me' | 'driver-registry' | 'driver-console' | 'fleet-admin'
  | 'carry-go-dash' | 'terminal' | 'terminal-pay' | 'hardware-audit'
  /* 🔹 END COMPATIBILITY KEYS */
  | 'login' | 'signup' | 'legal' | 'business-verification'
  | 'onboarding' | 'support' | 'splash';

export type Language = 'en' | 'ig' | 'pcm' | 'ha' | 'yo' | 'fr' | 'zh';
export type UserRole = 'visitor' | 'registered' | 'business_owner' | 'verified_business' | 'buyer' | 'editor' | 'admin' | 'driver' | 'fleet_commander';
export type Role = UserRole;

export enum VehicleCategory {
  STANDARD = 'Standard (City)',
  EXECUTIVE = 'Executive (SR_Luxury)',
  CARGO_SMALL = 'Small Cargo (Carry-Go Lite)',
  SHIELD = 'Purple Shield (Armed Escort)'
}

export enum ComplianceLevel {
  LEVEL_1 = 'Level 1: Verified',
  LEVEL_2 = 'Level 2: Elite',
  LEVEL_3 = 'Level 3: Shield'
}

export interface DriverPartner {
  id: string;
  user_email: string;
  full_name: string;
  nin_verified: boolean;
  bvn_verified: boolean;
  license_verified: boolean;
  device_imei: string;
  compliance_level: ComplianceLevel;
  rating: number;
  status: 'offline' | 'online' | 'active_ride' | 'suspended' | 'emergency';
  current_vehicle_id: string;
  total_earnings: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

export interface Vehicle {
  id: string;
  owner_email: string;
  driver_name: string;
  driver_phone: string;
  driver_nin: string;
  plate_number: string;
  vin: string;
  vehicle_model: string;
  vehicle_year: string;
  category: VehicleCategory;
  image_url: string;
  docs_url: string; 
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'online' | 'active_ride' | 'offline';
  current_lat?: number;
  current_lng?: number;
  rating: number;
  created_at: string;
}

export interface RideBooking {
  id: string;
  passenger_email: string;
  passenger_name: string;
  passenger_rating: number;
  driver_id: string;
  vehicle_id: string;
  pickup_addr: string;
  dropoff_addr: string;
  pickup_notes?: string;
  amount: number;
  driver_share: number;
  platform_share: number;
  status: 'requested' | 'accepted' | 'navigating_to_pickup' | 'arrived_at_pickup' | 'navigating_to_destination' | 'completed' | 'cancelled' | 'emergency';
  tracking_session_id: string;
  created_at: string;
}

export interface EmergencyAlert {
  id: string;
  ride_id: string;
  initiator: 'passenger' | 'driver';
  lat: number;
  lng: number;
  timestamp: string;
  status: 'active' | 'resolved';
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid', 
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  DISPUTED = 'disputed',
  RELEASED = 'released',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  post_id?: string;
  product_id?: string;
  buyer_id: string;
  seller_id: string;
  merchant_id?: string;
  amount: number;
  commission_deducted: number;
  merchant_payout: number;
  status: OrderStatus;
  reference?: string;
  tracking_id?: string;
  escrow_release_at?: string;
  created_at: string;
  // Joined fields
  buyer?: Profile;
}

export interface Dispute {
  id: string;
  order_id: string;
  merchant_id: string;
  user_id: string;
  reason: string;
  status: 'open' | 'resolved' | 'refunded';
  evidence_url?: string;
  created_at: string;
}

export enum HubTier {
  STARTER = 'Starter Hub',
  LOCAL_TRUST = 'Local Trust Hub',
  GROWTH_ENGINE = 'Growth Engine Hub',
  EXPORT_READY = 'Export Ready Hub'
}

export enum SubscriptionTier {
  FREE = 'Free',
  VERIFIED = 'Verified',
  GROWTH = 'Growth',
  PREMIUM = 'Premium'
}

export enum BillingCycle {
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly'
}

export type BusinessType = 'Artisan' | 'Manufacturer' | 'Wholesaler' | 'Retailer';

export interface BusinessPlan {
  id: SubscriptionTier;
  name: string;
  monthlyAmount: number;
  yearlyAmount: number;
  slots: number;
  features: string[];
}

export interface EditorialStory {
  id: string;
  title: string;
  hero_image: string;
  body_text: string;
  why_selected: string;
  specialization: string;
  trust_signals: string;
  best_time_to_engage: string;
  category_tags: string[];
  linked_business_id: string;
  editorial_level: VerificationLevel;
  published: boolean;
  published_date: string;
}

export interface QualityAudit {
  id: string;
  hotel_id: string;
  score: number;
  remarks: string;
  action_taken: string;
  created_at: string;
}

export enum Category {
  SHOEMAKING = 'Shoemaking & Leather',
  TAILORING = 'Fashion & Garments',
  ENGINEERING = 'Engineering & Metalwork',
  TEXTILES = 'Textiles & Chemicals',
  WOODWORK = 'Woodwork & Furniture',
  HOSPITALITY = 'Hotels & Hospitality',
  EVENTS = 'Events & Protocols',
  CULTURE = 'Culture & Traditions',
  RELIGION = 'Religious Organizations',
  FINANCE = 'Thrift & Finance',
  LOGISTICS = 'Logistics & Cargo',
  PUZZLES = 'Industrial Puzzles & Crafts',
  AGRICULTURE = 'Agro-Processing & Staples',
  PRINTING = 'Printing & Packaging Hub',
  AUTOMOTIVE = 'Auto Parts & Mechanical',
  TRADING = 'General Import & Export',
  USED_BALES = 'Fairly Used (Jumbo Bales)',
  TOKUNBO_IMPORT = 'Tokunbo & Auto Import',
  TECH_GADGETS = 'Tech Hub & IT Gadgets',
  EDUCATION = 'Schools & Training Centers',
  HEALTHCARE = 'Hospitals & Pharmacies',
  LEGAL_PROFESSIONAL = 'Legal & Professional Services',
  MEDIA_ENTERTAINMENT = 'Media, Studios & Entertainment',
  REAL_ESTATE = 'Real Estate & Construction',
  BEAUTY_PERSONAL_CARE = 'Beauty, Salons & Spas',
  FOOD_RESTAURANTS = 'Restaurants & Food Hubs',
  PLASTICS = 'Plastics & Polythene',
  COSMETICS = 'Cosmetics & Soap Making',
  PHARMACEUTICALS = 'Industrial Pharmaceutics',
  GLASS_ALUMINUM = 'Glass & Aluminum Works',
  ELECTRICAL = 'Electrical & Wiring',
  HARDWARE = 'Industrial Tools & Hardware',
  WASTE_MANAGEMENT = 'Waste Sync & Recycling',
  SOLAR_ENERGY = 'Solar & Renewable Energy',
  SECURITY = 'Security Systems & Gadgets',
  OFFICE_SUPPLIES = 'Office Supplies & Stationery',
  BAKERY = 'Bakeries & Confectionery',
  CLEANING = 'Industrial Cleaning Services',
  TRAVEL = 'Travel & Tourism Agencies',
  CONSULTANCY = 'Business Consultancy & R&D',
  PUBLIC_SERVICES = 'Public Services & Utilities',
  // Expanded Categories (Comprehensive Industry Sectors)
  ACCOUNTING_BOOKKEEPING = 'Accounting & Bookkeeping',
  ADVERTISING_MARKETING = 'Advertising & Marketing',
  AEROSPACE_AVIATION = 'Aerospace & Aviation Hub',
  ANIMAL_HEALTH_CARE = 'Animal Health & Veterinary',
  ARCHITECTURE_INTERIOR = 'Architecture & Interior Design',
  ARTS_CRAFTS_GALLERY = 'Arts, Crafts & Galleries',
  BANKING_INVESTMENT = 'Banking & Investment Services',
  BIOTECH_PHARMA = 'Biotechnology & Pharmaceuticals',
  BROADCASTING_MEDIA = 'Broadcasting & Media Production',
  BUILDING_INFRASTRUCTURE = 'Building & Infrastructure',
  CHEMICALS_PLASTICS = 'Chemicals, Plastics & Synthetics',
  CIVIL_CONSTRUCTION = 'Civil & Heavy Construction',
  CLEANING_MAINTENANCE = 'Cleaning & Facility Maintenance',
  COMMUNITY_NONPROFIT = 'Community & Non-Profit Org',
  COMPUTER_IT_SERVICES = 'Computer & IT Services',
  CONSULTING_STRATEGY = 'Consulting & Business Strategy',
  COSMETICS_WELLNESS = 'Cosmetics, Beauty & Wellness',
  COURIER_POSTAL = 'Courier & Postal Services',
  CREATIVE_DESIGN = 'Creative Arts & Graphic Design',
  CUSTOMER_RELATIONS = 'Customer Relations & Support',
  CYBERSECURITY_DATA = 'Cybersecurity & Data Privacy',
  DATA_SCIENCE_ANALYTICS = 'Data Science & Analytics',
  DIGITAL_PUBLISHING = 'Digital Publishing & E-books',
  E_COMMERCE_RETAIL = 'E-commerce & Digital Retail',
  EDUCATION_LEARNING = 'Education & E-learning Hub',
  ELECTRICAL_POWER = 'Electrical, Power & Energy',
  ELECTRONICS_ASSEMBLY = 'Electronics & Circuit Assembly',
  ENVIRONMENT_RECYCLING = 'Environment, Waste & Recycling',
  EVENT_MANAGEMENT = 'Event Management & Planning',
  FASHION_APPAREL_RETAIL = 'Fashion & Apparel Retail',
  FILM_ANIMATION = 'Film, Animation & VFX',
  FINANCIAL_PLANNING = 'Financial Planning & Tax',
  FISHERIES_MARICULTURE = 'Fisheries & Mariculture',
  FITNESS_SPORTS_COACH = 'Fitness, Sports & Coaching',
  FLORISTRY_LANDSCAPING = 'Floristry & Landscaping',
  FOOD_BEVERAGE_PROD = 'Food & Beverage Production',
  FORESTRY_TIMBER = 'Forestry & Timber Production',
  GAMING_SOFTWARE = 'Gaming & Interactive Software',
  GOVERNMENT_BODIES = 'Government & Regulatory Bodies',
  HEALTHCARE_DIAGNOSTICS = 'Healthcare & Diagnostics',
  HUMAN_RESOURCES_HR = 'Human Resources & Recruitment',
  IMPORT_EXPORT_TRADE = 'Import, Export & Global Trade',
  INDUSTRIAL_EQUIPMENT = 'Industrial Tools & Equipment',
  INSURANCE_BROKERAGE = 'Insurance & Brokerage Services',
  INTERNATIONAL_AFFAIRS = 'International Affairs & NGOs',
  JEWELRY_WATCHMAKING = 'Jewelry & Watchmaking',
  LAND_SURVEYING = 'Land Surveying & Geomatics',
  LEGAL_JUSTICE_LAW = 'Legal, Law & Justice Services',
  LIVESTOCK_FARMING = 'Livestock & Poultry Farming',
  LOGISTICS_WAREHOUSING = 'Logistics & Warehousing Hub',
  MANUFACTURING_HEAVY = 'Heavy Industrial Manufacturing',
  MANUFACTURING_LIGHT = 'Light Consumer Manufacturing',
  MARINE_SHIPPING = 'Marine, Shipping & Ports',
  MINING_EXPLORATION = 'Mining & Mineral Exploration',
  MUSIC_SOUND_ENGINEER = 'Music Production & Sound Eng',
  OIL_GAS_PETROLEUM = 'Oil, Gas & Petroleum Services',
  PERSONAL_CARE_SERVICES = 'Personal & Household Services',
  PHOTOGRAPHY_VIDEOGRAPHY = 'Photography & Videography',
  PLUMBING_HEATING_ACS = 'Plumbing, Heating & Cooling',
  PRINTING_PACKAGING = 'Printing & Industrial Packaging',
  PROJECT_MANAGEMENT = 'Project & Program Management',
  PROPERTY_REAL_ESTATE = 'Property & Real Estate Mgmt',
  PUBLIC_RELATIONS_COMM = 'Public Relations & Comms',
  RELIGIOUS_SERVICES = 'Religious & Spiritual Services',
  RENEWABLE_ENERGY_SOLAR = 'Renewable & Solar Energy',
  RESEARCH_DEVELOPMENT = 'Research & Development (R&D)',
  RESTAURANT_CATERING = 'Restaurants & Industrial Catering',
  SAFETY_SECURITY_SYSTEMS = 'Safety & Security Systems',
  SALES_MARKETING_DEV = 'Sales, Marketing & Growth',
  SOCIAL_SERVICES_AID = 'Social Services & Humanitarian',
  SOFTWARE_ENGINEERING = 'Software Engineering & SaaS',
  SPORTS_RECREATION_FAC = 'Sports & Recreation Facilities',
  TELECOMMUNICATIONS_NET = 'Telecommunications & Networks',
  TEXTILE_GARMENT_MANUF = 'Textile & Garment Industry',
  TOURISM_TRAVEL_AGENCY = 'Tourism & Travel Agencies',
  TRANSLATION_SERVICES = 'Translation & Interpretation',
  TRANSPORTATION_PASSENGER = 'Transportation (Passenger)',
  UPHOLSTERY_INTERIOR = 'Upholstery & Interior Decor',
  URBAN_PLANNING_DEV = 'Urban Planning & Development',
  VETERINARY_ACTIVITIES = 'Veterinary & Animal Health',
  VOCATIONAL_REHAB = 'Vocational Training & Rehab',
  WHOLESALE_DISTRIBUTION = 'Wholesale & Distribution',
  WOOD_TIMBER_WORKS = 'Wood, Timber & Joinery Works',
  WRITING_EDITING_PUB = 'Writing, Editing & Publishing'
}

export enum VerificationStatus {
  UNVERIFIED = 'Unverified',
  PENDING = 'Pending',
  VERIFIED = 'Verified'
}

export enum IntegrityGrade {
  A_PLUS = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D'
}

export enum VerificationLevel {
  NONE = 'None',
  LISTED = 'Listed',
  DOCUMENT_VERIFIED = 'Document Verified',
  PHYSICALLY_VERIFIED = 'Physically Verified',
  VERIFIED = 'Verified',
  EDITORIAL = 'Editorial',
  SIGNATURE = 'Signature'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
  specifications?: string;
  status: 'active' | 'draft' | 'sold_out';
  stock_count?: number;
  sku?: string;
  tags?: string[];
  condition?: 'New' | 'Fairly Used' | 'Refurbished';
}

export interface Business {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  category: Category;
  primary_product_or_service: string;
  area: string;
  address: string;
  phone_whatsapp: string;
  image_url: string;
  rating: number;
  review_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';
  verification_status: VerificationStatus;
  verification_level: VerificationLevel;
  integrity_grade: IntegrityGrade;
  hub_tier?: HubTier;
  is_export_ready: boolean;
  capacity_indicator: string;
  premium_features_enabled: boolean;
  commission_rate?: number; 
  subscription_tier?: SubscriptionTier;
  settlement_frequency?: string;
  active_features: {
    physical_verification_badge?: boolean;
    priority_score_bonus?: number;
    sponsored_badge?: boolean;
    verified_exporter_badge?: boolean;
    trade_analytics_access?: 'basic' | 'advanced';
    tokunbo_specialist_badge?: boolean;
    featured_rank?: number;
  };
  products: Product[];
  latitude?: number;
  longitude?: number;
  video_caption?: string;
  created_at: string;
  description?: string;
  business_type?: string;
  is_verified?: boolean;
  is_hidden_gem?: boolean;
  transformation_story?: {
    before: string;
    after: string;
    image_before?: string;
    image_after?: string;
  };
  catalog_images?: string[];
  videos?: { url: string; caption: string }[];
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  skills?: string[];
  experience_years?: number;
  portfolio_images?: string[];
  verified_presence?: boolean;
  verified_presence_lat?: number;
  verified_presence_lng?: number;
  verified_presence_at?: string;
}

export type ShipmentStatus = 'requested' | 'pickup-scheduled' | 'at-hub' | 'in-transit' | 'delivered' | 'confirmed';

export interface TrackingEvent {
  timestamp: string;
  description: string;
  location: string;
}

export interface LogisticsOrder {
  id: string;
  user_email: string;
  trackingId: string;
  status: ShipmentStatus;
  pickupAddress: string;
  deliveryAddress: string;
  totalFee: number;
  riderPayout: number;
  timestamp: string;
  events?: TrackingEvent[];
  carrier?: string;
  estimatedDelivery?: string;
}

export interface Hotel {
  id: string;
  name: string;
  image_url: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  quality_score: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  hotel_id: string;
  room_id: string;
  hotel_name?: string;
  hotel_address?: string;
  room_number?: string;
  total_amount: number;
  check_in: string;
  check_out: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  guest_name?: string;
  guest_address?: string;
  guest_phone?: string;
  guest_company?: string;
  stay_duration?: number;
  special_requests?: string;
  guests_count?: number;
}

export interface LedgerEntry {
  id: string;
  booking_id?: string;
  order_id?: string;
  gross_amount: number;
  sandalsroyalle_share: number;
  hotel_share: number;
  merchant_share?: number;
  vat: number;
  settlement_status: 'pending' | 'paid';
  created_at: string;
}

export interface HospitalityConfig {
  id: string;
  vat_rate: number;
  sr_share_percentage: number;
  hotel_share_percentage: number;
  sr_exec_markup: number;
  updated_at: string;
}

export interface ThriftAccount {
  id: string;
  user_id: string;
  user_email: string;
  protocol_type?: string;
  amount?: number;
  cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  total_saved: number;
  status: 'active' | 'settled' | 'matured' | 'withdrawn';
  start_date: string;
  locked_until?: string;
  service_fee_rate?: number; // 0.035 for 3.5% fee
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  swift_code?: string;
}

export interface ThriftContribution {
  id: string;
  thrift_id: string;
  user_email: string;
  amount: number;
  created_at: string;
}

export interface ThriftGroup {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  contribution_amount: number;
  cycle_length: number; // Number of members/slots
  max_members: number;
  payout_frequency: 'daily' | 'weekly' | 'monthly';
  visibility: 'public' | 'private';
  invite_code?: string;
  start_date: string | null;
  status: 'forming' | 'active' | 'completed';
  created_at: string;
}

export interface ThriftGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  user_email?: string; // For display
  payout_position: number | null;
  has_received: boolean;
  joined_at: string;
}

export interface ThriftGroupContribution {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  cycle_number: number;
  created_at: string;
}

export interface ThriftPayout {
  id: string;
  group_id: string;
  user_id: string;
  cycle_number: number;
  amount: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
}

export interface Advertorial {
  id: string;
  title: string;
  content: string;
  featured_image: string;
  author_name: string;
  category?: string;
  views: number;
  grounding?: any[];
  created_at: string;
}

export interface PlatformConfig {
  id: number;
  app_logo: string;
  oracle_avatar: string;
  hero_images: string[];
  hero_videos: { url: string; caption: string }[];
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  attachments?: { url: string; name: string; mime: string }[];
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

export interface PresenceUser {
  key: string;
  user_id: string;
  displayName: string;
  role?: string;
  typing: boolean;
  online_at: string;
  avatarUrl?: string;
}

export interface FeedEvent {
  id: string;
  type: 'new-artisan' | 'new-product' | 'verified-sale' | 'shoutout' | 'logistics-milestone';
  title: string;
  description: string;
  timestamp: Date;
}

export type LegalDocType = 'terms' | 'privacy' | 'refund' | 'vendor' | 'ads' | 'license';

export interface VendorLicense {
  id: string;
  business_id: string;
  type: string;
  url: string;
  status: 'pending' | 'active' | 'expired';
  created_at: string;
}

export type AdType = 'featured_listing' | 'banner' | 'sponsored_story';

export interface AdCampaign {
  id: string;
  business_id: string;
  type: AdType;
  title: string;
  description?: string;
  image_url: string;
  start_date: string;
  end_date: string;
  price_paid: number;
  status: 'active' | 'expired' | 'pending';
  category?: string;
}

export interface AdPlan extends BusinessPlan {
  price?: number;
  duration_days?: number;
}

export interface PaymentLog {
  id?: string;
  user_id: string;
  plan_id: string;
  amount: number;
  provider: string;
  status: string;
  created_at?: string;
}

export enum RoomType {
  STANDARD = 'Standard',
  SR_EXEC = 'SR_Executive',
  SUITE = 'Suite'
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: RoomType;
  base_price: number;
  status: 'available' | 'booked' | 'maintenance';
}

export interface BuyerSignal {
  id: string;
  buyer_email: string;
  buyer_name: string;
  category: Category;
  urgency: 'routine' | 'urgent' | 'immediate';
  volume: string;
  requirement: string;
  delivery_region: string;
  budget_range?: string;
  status: 'open' | 'closed';
  response_count: number;
  payment_method?: string;
  created_at: string;
}

export interface SignalInterest {
  id: string;
  signal_id: string;
  merchant_id: string;
  merchant_name: string;
  message: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'alert';
  read: boolean;
  timestamp: string;
}

export interface Profile {
  id: string;
  auth_id?: string;
  email: string;
  phone?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  referral_code: string;
  referred_by?: string;
  referral_count: number;
  referral_earnings: number;
  preferred_language?: string;
  notification_settings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dark_mode?: boolean;
  onboarding_stage?: string;
  created_at: string;
}

export type PostActionType = 'none' | 'buy' | 'book' | 'reserve' | 'pay';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  action_type: PostActionType;
  price?: number;
  currency?: string;
  action_label?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // Joined fields
  author?: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  expires_at: string;
  created_at: string;
  author?: Profile;
}

export interface StoryView {
  id: string;
  story_id: string;
  user_id: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  reference: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  reward_granted: boolean;
  reward_amount: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  due_date?: string;
  priority: number;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}
