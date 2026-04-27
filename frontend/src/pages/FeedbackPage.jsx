import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Star,
  Clock3,
  ShieldCheck,
  Search,
  Filter,
  FileCheck2,
  ArrowRight,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import RatingModal from "../components/RatingModal";
import { complaintAPI } from "../services/api";
import T from "../components/T";

const TABS = {
  my: "My Feedback",
  community: "Community Feedback",
};

const average = (value) => Number(value || 0).toFixed(1);

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatCard = ({ icon: Icon, label, value, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">
          <T en={label} />
        </p>
        <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={22} className={color} />
      </div>
    </div>
  </motion.div>
);

const StarRow = ({ value }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={16}
        className={
          star <= Math.round(value || 0)
            ? "fill-amber-400 text-amber-400"
            : "text-gray-200"
        }
      />
    ))}
  </div>
);

const MyComplaintCard = ({ complaint, onRate }) => {
  const canRate = !complaint.feedbackSubmitted;
  const visibilityLabel = complaint.feedbackSubmitted
    ? complaint.myFeedbackIsAnonymous
      ? "Posted anonymously"
      : "Posted with your profile name"
    : "Choose anonymous or public profile visibility when you rate";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
              {complaint.ticketId}
            </span>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              <T en="Resolved" />
            </span>
            {complaint.feedbackSubmitted && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <T en="Feedback Submitted" />
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base font-bold text-gray-900">
            {complaint.title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {complaint.category && <span>{complaint.category}</span>}
            {complaint.location && <span>{complaint.location}</span>}
            <span>{formatDate(complaint.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            <T
              en={
                canRate
                  ? "Rate the resolution quality, response time, and officer professionalism. You can choose to post it anonymously or with your profile name."
                  : "Your feedback for this resolved complaint has already been posted."
              }
            />
          </p>
          <p className="mt-2 text-xs font-medium text-gray-500">
            <T en={visibilityLabel} />
          </p>
          {complaint.myAverageRating ? (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-700">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              {average(complaint.myAverageRating)}/5
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center md:justify-end">
          <button
            onClick={() => canRate && onRate(complaint)}
            disabled={!canRate}
            className={`inline-flex min-w-[140px] items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              canRate
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <Star size={15} />
            <T en={canRate ? "Rate Now" : "Submitted"} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CommunityFeedbackCard = ({ item, index, onView }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
            {item.complaint?.ticketId || "Closed Complaint"}
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {average(item.averageRating)}/5 <T en="overall" />
          </span>
        </div>
        <h3 className="mt-3 text-base font-bold text-gray-900">
          {item.complaint?.title || "Complaint feedback"}
        </h3>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>{item.userName || "Citizen"}</span>
          {item.complaint?.category && <span>{item.complaint.category}</span>}
          {item.complaint?.location && <span>{item.complaint.location}</span>}
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <StarRow value={item.averageRating} />
        {item.complaint?._id && (
          <button
            onClick={() => onView(item.complaint._id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye size={15} />
            <T en="View Complaint" />
          </button>
        )}
      </div>
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <div>
        <p className="mb-1 text-sm text-gray-600">
          <T en="Resolution Quality" />
        </p>
        <StarRow value={item.resolutionQuality} />
      </div>
      <div>
        <p className="mb-1 text-sm text-gray-600">
          <T en="Response Time" />
        </p>
        <StarRow value={item.responseTime} />
      </div>
      <div>
        <p className="mb-1 text-sm text-gray-600">
          <T en="Officer Professionalism" />
        </p>
        <StarRow value={item.officerProfessionalism} />
      </div>
    </div>

    <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
      {item.comment?.trim() ? (
        item.comment
      ) : (
        <span className="italic text-gray-400">
          <T en="No written comment was shared for this feedback." />
        </span>
      )}
    </div>
  </motion.div>
);

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my");
  const [communityFeedback, setCommunityFeedback] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [myResolvedComplaints, setMyResolvedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackRes, complaintsRes] = await Promise.all([
        complaintAPI.getAllFeedback(),
        complaintAPI.getAll({ mine: true, status: "resolved" }),
      ]);

      setCommunityFeedback(feedbackRes.data.data || []);
      setCommunityStats(feedbackRes.data.stats || null);

      const complaints = complaintsRes.data.data;
      setMyResolvedComplaints(
        Array.isArray(complaints) ? complaints : complaints?.complaints || [],
      );
    } catch {
      toast.error("Failed to load citizen feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCommunity = useMemo(() => {
    return communityFeedback.filter((item) => {
      const haystack = [
        item.userName,
        item.comment,
        item.complaint?.title,
        item.complaint?.ticketId,
        item.complaint?.category,
        item.complaint?.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search.trim()
        ? true
        : haystack.includes(search.trim().toLowerCase());

      const matchesRating =
        ratingFilter === "all"
          ? true
          : Math.round(item.averageRating || 0) >= Number(ratingFilter);

      return matchesSearch && matchesRating;
    });
  }, [communityFeedback, ratingFilter, search]);

  const filteredMine = useMemo(() => {
    return myResolvedComplaints.filter((complaint) => {
      const haystack = [
        complaint.title,
        complaint.ticketId,
        complaint.category,
        complaint.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search.trim()
        ? true
        : haystack.includes(search.trim().toLowerCase());

      const matchesRating =
        ratingFilter === "all"
          ? true
          : ratingFilter === "pending"
            ? !complaint.feedbackSubmitted
            : ratingFilter === "submitted"
              ? complaint.feedbackSubmitted
              : true;

      return matchesSearch && matchesRating;
    });
  }, [myResolvedComplaints, ratingFilter, search]);

  const myStats = useMemo(() => {
    const totalResolved = myResolvedComplaints.length;
    const submitted = myResolvedComplaints.filter(
      (complaint) => complaint.feedbackSubmitted,
    );
    const pending = totalResolved - submitted.length;

    const avgMyRating =
      submitted.length > 0
        ? submitted.reduce(
            (sum, complaint) => sum + Number(complaint.myAverageRating || 0),
            0,
          ) / submitted.length
        : 0;

    return {
      totalResolved,
      pending,
      submitted: submitted.length,
      avgMyRating,
    };
  }, [myResolvedComplaints]);

  const statCards =
    activeTab === "my"
      ? [
          {
            icon: FileCheck2,
            label: "Resolved Complaints",
            value: myStats.totalResolved,
            color: "text-teal-700",
            bg: "bg-teal-50",
          },
          {
            icon: Star,
            label: "Pending Ratings",
            value: myStats.pending,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            icon: MessageSquare,
            label: "Submitted Ratings",
            value: myStats.submitted,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: ShieldCheck,
            label: "My Average Rating",
            value: average(myStats.avgMyRating),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ]
      : [
          {
            icon: MessageSquare,
            label: "Total Feedback",
            value: communityStats?.total || 0,
            color: "text-teal-700",
            bg: "bg-teal-50",
          },
          {
            icon: Star,
            label: "Overall Rating",
            value: average(communityStats?.averageRating),
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            icon: Clock3,
            label: "Response Time",
            value: average(communityStats?.averageResponseTime),
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: ShieldCheck,
            label: "Professionalism",
            value: average(communityStats?.averageOfficerProfessionalism),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ];

  const activeCount =
    activeTab === "my" ? filteredMine.length : filteredCommunity.length;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          <T en="Citizen Feedback" />
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          <T
            en={
              activeTab === "my"
                ? "Rate your own resolved complaints here. You can publish feedback anonymously or with your profile name."
                : "Browse citizen-submitted feedback shared after complaint closure."
            }
          />
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm"
      >
        <div className="flex flex-wrap gap-2">
          {Object.entries(TABS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setRatingFilter("all");
                setSearch("");
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <T en={label} />
            </button>
          ))}
        </div>
      </motion.div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <StatCard key={card.label} delay={0.05 + index * 0.05} {...card} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "my"
                ? "Search your resolved complaints"
                : "Search ticket, complaint, location, citizen, or comment"
            }
            className="w-72 max-w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-700 outline-none"
          >
            {activeTab === "my" ? (
              <>
                <option value="all">All resolved complaints</option>
                <option value="pending">Pending my rating</option>
                <option value="submitted">Already rated</option>
              </>
            ) : (
              <>
                <option value="all">All ratings</option>
                <option value="4">4 stars and up</option>
                <option value="3">3 stars and up</option>
                <option value="2">2 stars and up</option>
                <option value="1">1 star and up</option>
              </>
            )}
          </select>
        </div>

        <span className="ml-auto text-sm text-gray-500">
          {activeCount} <T en="entries shown" />
        </span>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
        </div>
      ) : activeTab === "my" ? (
        filteredMine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <FileCheck2 size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">
              <T en="No resolved complaints matched your filters." />
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMine.map((complaint) => (
              <MyComplaintCard
                key={complaint._id}
                complaint={complaint}
                onRate={setSelectedComplaint}
              />
            ))}
          </div>
        )
      ) : filteredCommunity.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <MessageSquare size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">
            <T en="No feedback matched your filters." />
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCommunity.map((item, index) => (
            <CommunityFeedbackCard
              key={item._id}
              item={item}
              index={index}
              onView={(id) =>
                navigate(`/complaints/${id}`, {
                  state: { from: "/feedback", label: "Citizen Feedback" },
                })
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-900">
        <span className="font-semibold">
          <T en="Visibility" />:
        </span>{" "}
        <T en="When you submit a rating, you can choose to publish it anonymously or let your profile name be visible to everyone in Community Feedback." />
        <span className="ml-2 inline-flex items-center gap-1 font-medium text-teal-700">
          <ArrowRight size={14} />
          <T en="Only closed complaints can be rated." />
        </span>
      </div>

      <RatingModal
        complaint={selectedComplaint}
        isOpen={Boolean(selectedComplaint)}
        onClose={() => setSelectedComplaint(null)}
        onSuccess={() => {
          setSelectedComplaint(null);
          loadData();
        }}
      />
    </DashboardLayout>
  );
};

export default FeedbackPage;
