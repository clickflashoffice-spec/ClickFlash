import React, { useState, useEffect } from "react";
import {
  moneyTrashEmailMarketing,
  EmailCampaign,
  EmailTemplate,
  CustomerSegment,
} from "../services/moneyTrashEmailMarketing";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MoneyTrashEmailMarketing: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "templates" | "analytics"
  >("campaigns");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);
  const [analytics, setAnalytics] = useState({
    totalCampaigns: 0,
    totalEmailsSent: 0,
    totalRevenue: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    avgConversionRate: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCampaigns(moneyTrashEmailMarketing.getCampaigns());
    setTemplates(moneyTrashEmailMarketing.getTemplates());
    setSegments(moneyTrashEmailMarketing.getSegments());
    setAnalytics(moneyTrashEmailMarketing.getGlobalAnalytics());
  };

  const handleCreateCampaign = (campaignData: any) => {
    moneyTrashEmailMarketing.createCampaign({
      ...campaignData,
      type: "manual",
      status: "draft",
    });
    loadData();
    setShowCreateModal(false);
  };

  const handleSendCampaign = (campaignId: string) => {
    // Would trigger actual send
    alert(`Campaign ${campaignId} queued for sending!`);
  };

  const handlePauseCampaign = (campaignId: string) => {
    moneyTrashEmailMarketing.pauseCampaign(campaignId);
    loadData();
  };

  const handleResumeCampaign = (campaignId: string) => {
    moneyTrashEmailMarketing.resumeCampaign(campaignId);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const mockChartData = [
    { name: "Mon", sent: 45, opened: 30, clicked: 15 },
    { name: "Tue", sent: 52, opened: 35, clicked: 18 },
    { name: "Wed", sent: 48, opened: 32, clicked: 16 },
    { name: "Thu", sent: 61, opened: 40, clicked: 22 },
    { name: "Fri", sent: 55, opened: 38, clicked: 20 },
    { name: "Sat", sent: 42, opened: 28, clicked: 14 },
    { name: "Sun", sent: 38, opened: 25, clicked: 12 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Money Trash Email Marketing
          </h1>
          <p className="text-gray-600">
            Automated and manual email campaigns for photo recovery
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Create Campaign
        </button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Campaigns</p>
          <p className="text-2xl font-bold">{analytics.totalCampaigns}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Emails Sent</p>
          <p className="text-2xl font-bold">
            {analytics.totalEmailsSent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ${analytics.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Open Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {analytics.avgOpenRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Click Rate</p>
          <p className="text-2xl font-bold text-purple-600">
            {analytics.avgClickRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Conversion</p>
          <p className="text-2xl font-bold text-orange-600">
            {analytics.avgConversionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 font-semibold ${activeTab === "campaigns" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 font-semibold ${activeTab === "templates" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 font-semibold ${activeTab === "analytics" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
        >
          Analytics
        </button>
      </div>

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 mb-4">No campaigns yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Create your first campaign
              </button>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{campaign.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(campaign.status)}`}
                      >
                        {campaign.status}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {campaign.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Trigger: {campaign.trigger} • {campaign.triggerDays} days
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sent</p>
                        <p className="font-bold">{campaign.stats.sent}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Opened</p>
                        <p className="font-bold text-blue-600">
                          {campaign.stats.opened} (
                          {campaign.stats.openRate.toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicked</p>
                        <p className="font-bold text-purple-600">
                          {campaign.stats.clicked} (
                          {campaign.stats.clickRate.toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Converted</p>
                        <p className="font-bold text-green-600">
                          {campaign.stats.converted} (
                          {campaign.stats.conversionRate.toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Revenue</p>
                        <p className="font-bold text-green-600">
                          ${campaign.stats.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {campaign.status === "draft" && (
                      <button
                        onClick={() => handleSendCampaign(campaign.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Send Now
                      </button>
                    )}
                    {campaign.status === "active" && (
                      <button
                        onClick={() => handlePauseCampaign(campaign.id)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Pause
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        onClick={() => handleResumeCampaign(campaign.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-4">
                Subject: {template.subject}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {template.previewText}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  From: {template.fromName}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  {template.variables.length} variables
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">
              Email Performance (Last 7 Days)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#8884d8"
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    stroke="#82ca9d"
                    name="Opened"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicked"
                    stroke="#ffc658"
                    name="Clicked"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">
                Top Performing Campaigns
              </h3>
              <div className="space-y-3">
                {campaigns
                  .sort((a, b) => b.stats.revenue - a.stats.revenue)
                  .slice(0, 5)
                  .map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <span className="font-medium">{campaign.name}</span>
                      <span className="text-green-600 font-bold">
                        ${campaign.stats.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Customer Segments</h3>
              <div className="space-y-3">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <span className="font-medium">{segment.name}</span>
                    <span className="text-gray-600">
                      {segment.customerCount} customers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create Email Campaign</h2>

            <form className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., Pre-Expiry Warning Campaign"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Trigger Type</label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="pre-expiry">Days Before Expiry</option>
                  <option value="expiry-day">On Expiry Day</option>
                  <option value="post-expiry">After Expiry</option>
                  <option value="bulk">Bulk Send</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Days Before Expiry
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={3}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Email Template
                </label>
                <select className="w-full p-2 border rounded-lg">
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Customer Segment
                </label>
                <select className="w-full p-2 border rounded-lg">
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateCampaign({})}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyTrashEmailMarketing;
