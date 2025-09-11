'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CreditCard, Gift, Share2, Copy, Check, AlertTriangle, 
  Zap, Users, TrendingUp, ExternalLink, Mail, MessageCircle,
  X, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Global type declaration for window function
declare global {
  interface Window {
    showReferralModal?: () => void;
  }
}

interface CreditInfo {
  credits: number;
  isLowCredits: boolean;
  costs: {
    github: number;
    linkedin: number;
    resume: number;
  };
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  recentReferrals: Array<{
    email: string;
    status: string;
    createdAt: string;
    creditsAwarded: number;
  }>;
}

interface CreditNotificationProps {
  show: boolean;
  credits: number;
  onClose: () => void;
  onEarnCredits: () => void;
}

function CreditNotification({ show, credits, onClose, onEarnCredits }: CreditNotificationProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">You're low on credits!</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            You have <span className="font-semibold text-red-600">{credits} credits</span> remaining. 
            You need at least 15-20 credits to use our analysis services.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">Service Costs:</h4>
            <div className="space-y-1 text-sm text-yellow-700">
              <div className="flex justify-between">
                <span>GitHub Analysis:</span>
                <span className="font-medium">20 credits</span>
              </div>
              <div className="flex justify-between">
                <span>LinkedIn Analysis:</span>
                <span className="font-medium">15 credits</span>
              </div>
              <div className="flex justify-between">
                <span>Resume Analysis:</span>
                <span className="font-medium">20 credits</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={onEarnCredits}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Zap className="h-5 w-5" />
            <span>Share to Earn 200 Credits</span>
          </button>
          
          <button 
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReferralModalProps {
  show: boolean;
  onClose: () => void;
  referralStats: ReferralStats | null;
  onRefresh: () => void;
}

function ReferralModal({ show, onClose, referralStats, onRefresh }: ReferralModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  if (!show || !referralStats) return null;

  const referralLink = `${window.location.origin}/auth/signup?ref=${referralStats.referralCode}`;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const shareViaEmail = () => {
    const subject = 'Join ReviewMe - Get AI-powered profile analysis!';
    const body = `Hi! I've been using ReviewMe to optimize my professional profile with AI-powered insights. Use my referral link to get started and we both earn 200 credits!\n\n${referralLink}\n\nReviewMe analyzes your GitHub, LinkedIn, and resume to provide personalized recommendations for career growth.`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaTwitter = () => {
    const text = `🚀 Optimizing my professional profile with @ReviewMe_AI! Get AI-powered insights for your GitHub, LinkedIn & resume. Join using my link and we both get 200 credits! ${referralLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                <Gift className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Earn 200 Credits</h3>
                <p className="text-sm text-gray-600">Share ReviewMe with friends and colleagues</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{referralStats.totalReferrals}</div>
              <div className="text-sm text-blue-600">Successful Referrals</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <TrendingUp className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{referralStats.pendingReferrals}</div>
              <div className="text-sm text-yellow-600">Pending Referrals</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{referralStats.totalCreditsEarned}</div>
              <div className="text-sm text-green-600">Credits Earned</div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Referral Code
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg font-semibold text-center text-gray-900">
                {referralStats.referralCode}
              </div>
              <button
                onClick={() => copyToClipboard(referralStats.referralCode, 'code')}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Referral Link
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 overflow-hidden">
                {referralLink}
              </div>
              <button
                onClick={() => copyToClipboard(referralLink, 'link')}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Share via:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={shareViaEmail}
                className="flex items-center justify-center space-x-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Mail className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">Email</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={shareViaTwitter}
                className="flex items-center justify-center space-x-3 px-4 py-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700">Twitter</span>
                <ExternalLink className="h-4 w-4 text-blue-400" />
              </button>
            </div>
          </div>

          {/* Recent Referrals */}
          {referralStats.recentReferrals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Recent Referrals</h4>
                <button
                  onClick={onRefresh}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {referralStats.recentReferrals.map((referral, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {referral.email.replace(/(.{3}).*@/, '$1***@')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        referral.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {referral.status}
                      </div>
                      {referral.creditsAwarded > 0 && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          +{referral.creditsAwarded} credits
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreditManager() {
  const { data: session } = useSession();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Expose function to show referral modal globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showReferralModal = () => {
        if (referralStats) {
          setShowReferralModal(true);
        } else {
          loadReferralStats().then(() => {
            setShowReferralModal(true);
          });
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.showReferralModal;
      }
    };
  }, [referralStats]);

  useEffect(() => {
    if (!session?.user?.email) return;
    
    loadCreditInfo();
    loadReferralStats();
  }, [session]);

  const loadCreditInfo = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();
      
      if (response.ok) {
        setCreditInfo(data);
        // Show notification if credits are low
        if (data.isLowCredits) {
          setShowNotification(true);
        }
      }
    } catch (error) {
      console.error('Error loading credit info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralStats = async () => {
    try {
      const response = await fetch('/api/referrals');
      const data = await response.json();
      
      if (response.ok) {
        setReferralStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  const handleEarnCredits = () => {
    setShowNotification(false);
    setShowReferralModal(true);
  };

  if (!session || isLoading) return null;

  return (
    <>
      <CreditNotification 
        show={showNotification}
        credits={creditInfo?.credits || 0}
        onClose={() => setShowNotification(false)}
        onEarnCredits={handleEarnCredits}
      />
      
      <ReferralModal 
        show={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        referralStats={referralStats}
        onRefresh={loadReferralStats}
      />
    </>
  );
}