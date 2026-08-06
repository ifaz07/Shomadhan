import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Radio, Users, Waves, Flame, Construction } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import ServantLayout from "../components/layout/ServantLayout";
import T from "../components/T";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { emergencyBroadcastAPI } from "../services/api";
import { getAssetBaseUrl } from "../utils/apiBase";

const roleMeta = {
  citizen: {
    title: "Emergency Alert History",
    titleBn: "জরুরি সতর্কতার ইতিহাস",
    description: "Review every emergency broadcast that was delivered to your address area.",
    descriptionBn: "আপনার ঠিকানা এলাকায় পাঠানো সব জরুরি সম্প্রচার দেখুন।",
    badge: "Citizen Alert Feed",
    badgeBn: "নাগরিক সতর্কতা ফিড",
  },
  mayor: {
    title: "Emergency Broadcast History",
    titleBn: "জরুরি সম্প্রচারের ইতিহাস",
    description: "Review the emergency broadcasts issued from the mayor control panel.",
    descriptionBn: "মেয়রের নিয়ন্ত্রণ প্যানেল থেকে পাঠানো জরুরি সম্প্রচার দেখুন।",
    badge: "Mayor Broadcast Archive",
    badgeBn: "মেয়রের সম্প্রচার সংরক্ষণাগার",
  },
  department_officer: {
    title: "Emergency Broadcast History",
    titleBn: "জরুরি সম্প্রচারের ইতিহাস",
    description: "Review the emergency broadcasts issued from the public servant control panel.",
    descriptionBn: "জনসেবা কর্মীর নিয়ন্ত্রণ প্যানেল থেকে পাঠানো জরুরি সম্প্রচার দেখুন।",
    badge: "Servant Broadcast Archive",
    badgeBn: "জনসেবা সম্প্রচার সংরক্ষণাগার",
  },
};

const disasterIcons = {
  fire: Flame,
  flood: Waves,
  road_collapse: Construction,
  other: AlertTriangle,
};

const disasterLabels = {
  fire: "Fire",
  flood: "Flood",
  road_collapse: "Road Collapse",
  other: "Emergency",
};

const audienceLabels = {
  citizen: "Citizens",
  mayor: "Mayor",
  department_officer: "Public Servants",
};

const resolveUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${getAssetBaseUrl()}${url}`;
};

const EmergencyBroadcastHistoryPage = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isServant = user?.role === "department_officer";
  const Layout = isServant ? ServantLayout : DashboardLayout;
  const meta = roleMeta[user?.role] || roleMeta.citizen;

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await emergencyBroadcastAPI.getAll();
        setHistory(res.data.data || []);
      } catch (error) {
        toast.error("Failed to load emergency history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <Layout>
      <div className="w-full space-y-6 px-0 sm:px-1">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-900 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:px-8 sm:py-8"
        >
          <div className="grid gap-6 xl:grid-cols-12 xl:items-end">
            <div className="xl:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-rose-100">
                <Radio size={12} className="text-rose-300" />
                {language === "bn" ? meta.badgeBn : meta.badge}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {language === "bn" ? meta.titleBn : meta.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
                {language === "bn" ? meta.descriptionBn : meta.description}
              </p>
            </div>
            <div className="xl:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm xl:ml-auto xl:max-w-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300"><T en="Visibility" /></p>
                <p className="mt-1 text-sm font-semibold text-white">
                  <T en="You only see broadcasts that were delivered to you or sent by your own control panel." />
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-gray-100 bg-white p-16 shadow-sm">
            <Loader2 size={28} className="animate-spin text-rose-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
            <AlertTriangle size={42} className="mx-auto text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-700"><T en="No emergency history found" /></p>
            <p className="mt-2 text-sm text-slate-400">
              <T en="Emergency broadcasts will appear here once they are sent and delivered to the relevant area." />
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {history.map((item, index) => {
              const Icon = disasterIcons[item.disasterType] || AlertTriangle;
              const disasterLabel = disasterLabels[item.disasterType] || "Emergency";
              const targetAudience = Array.isArray(item.targetRoles) && item.targetRoles.length > 0
                ? item.targetRoles.map((role) => audienceLabels[role] || role).join(" + ")
                : "Citizens";

              return (
                <motion.article
                  key={item._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
                          <T en={disasterLabel} />
                        </div>
                        <h2 className="mt-2 text-xl font-black text-slate-900"><T en={item.title} /></h2>
                      </div>
                    </div>
                    <span className="text-right text-xs font-semibold text-slate-400">
                      {new Date(item.createdAt).toLocaleString(language === "bn" ? "bn-BD" : "en-US")}
                    </span>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600"><T en={item.message} /></p>

                  {/* Audio Player for Voice Alert */}
                  {item.audioUrl && (
                    <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-100/50 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Radio size={14} className="text-rose-600" />
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest"><T en="Official Voice Alert" /></span>
                      </div>
                      <audio controls className="w-full h-9">
                        <source src={resolveUrl(item.audioUrl)} type="audio/webm" />
                        <T en="Your browser does not support the audio element." />
                      </audio>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><T en="Affected Area" /></p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800"><T en={item.areaLabel} /></p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><T en="Coverage" /></p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                        {item.radiusKm} <T en="km radius" />
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <T en="Target:" /> <T en={targetAudience} />
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                        <Users size={14} />
                        <span>
                          {item.recipientsCount} <T en={item.recipientsCount === 1 ? "recipient targeted" : "recipients targeted"} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                    <span>
                      <T en="Sent by" /> <span className="font-semibold text-slate-700">{item.sender?.name || <T en="Unknown sender" />}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                      <T en={item.senderRole === "mayor" ? "Mayor" : "Public Servant"} />
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmergencyBroadcastHistoryPage;
