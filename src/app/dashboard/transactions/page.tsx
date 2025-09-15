'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { 
  History, RefreshCw, CreditCard, TrendingDown, Calendar, 
  Filter, Download, Search, ChevronDown, ChevronUp, Clock, 
  Minus, Github, Linkedin, FileText, Star, AlertCircle,
  CheckCircle, XCircle, Loader2, ArrowLeft, BarChart3,
  DollarSign, Activity, Users
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface Transaction {
  id: string;
  serviceType: string;
  creditsDeducted: number;
  description: string;
  timestamp: string;
  requestId: string;
  status: string;
  payload?: any;
  source: string;
}

interface TransactionSummary {
  serviceType: string;
  totalCreditsUsed: number;
  usageCount: number;
  lastUsed: string;
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    loadTransactions();
  }, [session, status, router, currentPage, filter]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (filter !== 'all') {
        params.append('serviceType', filter);
      }
      
      const response = await fetch(`/api/credits/history?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      setTransactions(data.transactions || []);
      setTransactionSummary(data.summary || []);
      setTotalPages(data.pagination?.pages || 1);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError(error.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filter]);

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'github':
        return <Github className="h-5 w-5 text-gray-700" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5 text-blue-600" />;
      case 'resume':
        return <FileText className="h-5 w-5 text-green-600" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      return transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
             transaction.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const totalCreditsSpent = transactionSummary.reduce((sum, item) => sum + item.totalCreditsUsed, 0);
  const totalTransactions = transactionSummary.reduce((sum, item) => sum + item.usageCount, 0);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Dashboard</span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors",
                    showFilters 
                      ? "bg-blue-50 border-blue-200 text-blue-700" 
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={loadTransactions}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Transaction History
              </h1>
              <p className="text-gray-600">
                View and manage your credit transactions and service usage history.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCreditsSpent}</p>
                  <p className="text-xs text-gray-500">credits</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
                  <p className="text-xs text-gray-500">requests</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Services Used</p>
                  <p className="text-2xl font-bold text-gray-900">{transactionSummary.length}</p>
                  <p className="text-xs text-gray-500">different services</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {transactions.filter(t => {
                      const txDate = new Date(t.timestamp);
                      const now = new Date();
                      return txDate.getMonth() === now.getMonth() && 
                             txDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                  <p className="text-xs text-gray-500">transactions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Services</option>
                    <option value="github">GitHub</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="resume">Resume</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search transactions..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilter('all');
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Service Summary */}
          {transactionSummary.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Summary by Service</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {transactionSummary.map((summary) => (
                  <div key={summary.serviceType} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getServiceIcon(summary.serviceType)}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {summary.serviceType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {summary.usageCount} uses
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Minus className="h-4 w-4 text-red-500" />
                      <span className="text-lg font-bold text-red-600">
                        {summary.totalCreditsUsed}
                      </span>
                      <span className="text-sm text-gray-500">credits used</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Last used: {formatDate(summary.lastUsed)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <p className="text-sm text-gray-600">Your complete transaction history</p>
            </div>
            
            <div className="px-6 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading transactions...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
                  <p className="text-sm text-red-600 mb-2">Failed to load transactions</p>
                  <p className="text-xs text-red-500 mb-3">{error}</p>
                  <button
                    onClick={loadTransactions}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors mx-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again</span>
                  </button>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getServiceIcon(transaction.serviceType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {transaction.serviceType}
                              </span>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(transaction.status)}
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  transaction.status === 'completed' ? "bg-green-100 text-green-800" :
                                  transaction.status === 'processing' ? "bg-blue-100 text-blue-800" :
                                  transaction.status === 'failed' ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                                )}>
                                  {transaction.status}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {transaction.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {formatDate(transaction.timestamp)}
                              </span>
                              {transaction.requestId && (
                                <span className="text-xs text-gray-400">
                                  • ID: {transaction.requestId.toString().slice(-8)}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                • Source: {transaction.source}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-red-600">
                              <Minus className="h-4 w-4" />
                              <span className="text-sm font-bold">
                                {transaction.creditsDeducted}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No transactions found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchTerm || filter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Start using our services to see your transaction history here'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}