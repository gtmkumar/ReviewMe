'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Send, HelpCircle, CheckCircle, AlertCircle, ThumbsUp, ThumbsDown, ExternalLink, Clock } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { faqCache } from '@/lib/faq-cache';
import { PublicNavigation } from '@/components/public-navigation';
import type { FAQ, FAQSearchResult, ContactFormData } from '@/types';

// Generate a simple session ID for tracking
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  faqs?: FAQ[];
  isHelpful?: boolean;
}

export default function ContactPage() {
  const { trackClick } = useAnalytics();
  const [activeTab, setActiveTab] = useState<'help' | 'contact'>('help');
  const [sessionId] = useState(() => generateSessionId());
  
  // Help Section State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FAQSearchResult[]>([]);
  const [popularFAQs, setPopularFAQs] = useState<FAQ[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m here to help you find answers to common questions. You can search below or browse our popular FAQs.',
      timestamp: new Date()
    }
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Contact Form State
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [escalatedFromFaq, setEscalatedFromFaq] = useState(false);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Load popular FAQs on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsInitialLoading(true);
      
      // Try to load from cache first
      const cachedFAQs = faqCache.getPopularFAQs();
      const cachedCategories = faqCache.getCategories();
      
      if (cachedFAQs && cachedCategories) {
        setPopularFAQs(cachedFAQs);
        setCategories(cachedCategories);
        setIsInitialLoading(false);
      } else {
        // Load from API if not cached
        await Promise.all([
          loadPopularFAQs(),
          loadCategories()
        ]);
        setIsInitialLoading(false);
      }
    };
    
    initializeData();
  }, []);
  
  const loadPopularFAQs = async () => {
    try {
      const response = await fetch(`/api/contact/faq?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        const faqs = data.results.map((r: FAQSearchResult) => r.faq);
        setPopularFAQs(faqs);
        
        // Cache the results if not already cached
        if (!data.cached) {
          faqCache.setPopularFAQs(faqs);
        }
        
        if (data.categories) {
          setCategories(data.categories);
          faqCache.setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Failed to load popular FAQs:', error);
    }
  };
  
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/contact?action=categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
        faqCache.setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };
  
  const searchFAQs = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const params = new URLSearchParams({
        q: query,
        sessionId,
        ...(selectedCategory && { category: selectedCategory })
      });
      
      const response = await fetch(`/api/contact/faq?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
        
        // Cache search results if not already cached
        if (!data.cached) {
          // Note: Search results are cached in the API
        }
        
        // Add bot response with search results
        const botMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'bot',
          content: data.results.length > 0 
            ? `I found ${data.results.length} answer${data.results.length === 1 ? '' : 's'} for "${query}". Here are the most relevant ones:`
            : `I couldn't find any specific answers for "${query}". You might want to try different keywords or contact us directly.`,
          timestamp: new Date(),
          faqs: data.results.length > 0 ? data.results.slice(0, 3).map((r: FAQSearchResult) => r.faq) : undefined
        };
        
        setChatMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: 'Sorry, there was an error searching for answers. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    searchFAQs(searchQuery);
    trackClick('faq_search', '/contact');
    
    setSearchQuery('');
  };
  
  const handleQuickQuestion = (question: string) => {
    setSearchQuery(question);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    searchFAQs(question);
    trackClick('faq_quick_question', '/contact');
  };
  
  const handleFAQFeedback = async (faqId: string, isHelpful: boolean) => {
    try {
      const response = await fetch('/api/contact/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faqId,
          feedback: isHelpful,
          sessionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the message to show feedback was submitted
        setChatMessages(prev => prev.map(msg => {
          if (msg.faqs?.some(faq => faq.id === faqId)) {
            return {
              ...msg,
              isHelpful: isHelpful
            };
          }
          return msg;
        }));
        
        trackClick(`faq_feedback_${isHelpful ? 'helpful' : 'not_helpful'}`, '/contact');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };
  
  const handleEscalateToContact = () => {
    setEscalatedFromFaq(true);
    setActiveTab('contact');
    
    // Pre-fill some context
    setContactForm(prev => ({
      ...prev,
      subject: prev.subject || 'Need help with: ' + searchQuery,
      message: prev.message || `I searched for "${searchQuery}" but couldn't find what I needed. `
    }));
    
    trackClick('escalate_to_contact', '/contact');
  };
  
  const handleContactFormChange = (field: keyof ContactFormData, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setFieldErrors({});
    setSubmitStatus('idle');
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          sessionId,
          escalatedFromFaq
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitStatus('success');
        setSubmitMessage(data.message);
        setContactForm({ name: '', email: '', subject: '', message: '' });
        trackClick('contact_form_submitted', '/contact');
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.error || 'Failed to submit your query');
        
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
      }
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setSubmitStatus('error');
      setSubmitMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const quickQuestions = [
    "How do I connect my GitHub account?",
    "How is my profile score calculated?",
    "What file formats are supported for resume upload?",
    "Can I make my profile private?",
    "How do I get more credits?"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavigation />
      <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact & Support
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find quick answers to common questions or get in touch with our support team
          </p>
        </div>

        {/* Initial Loading */}
        {isInitialLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading help center...</span>
            </div>
          </div>
        )}

        {/* Content - only show when not initially loading */}
        {!isInitialLoading && (
          <>
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setActiveTab('help')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'help'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 inline-block mr-2" />
              Help & FAQ
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-3 rounded-md font-medium transition-all ml-1 ${
                activeTab === 'contact'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline-block mr-2" />
              Contact Us
            </button>
          </div>
        </div>

        {/* Help Section */}
        {activeTab === 'help' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Search & Quick Questions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Search Help Topics
                </h3>
                
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="mb-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask a question..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </form>
                
                {/* Quick Questions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Popular Questions
                  </h4>
                  <div className="space-y-2">
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(question)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Help Assistant
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Ask questions or browse answers below
                  </p>
                </div>
                
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <div className={`max-w-3xl rounded-lg px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.type === 'system'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        
                        {/* Display FAQs */}
                        {message.faqs && message.faqs.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {message.faqs.map((faq) => (
                              <div key={faq.id} className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">
                                  {faq.question}
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                  {faq.answer}
                                </p>
                                
                                {/* FAQ Feedback */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {faq.tags.map((tag) => (
                                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">Was this helpful?</span>
                                    <button
                                      onClick={() => handleFAQFeedback(faq.id, true)}
                                      className={`p-1 rounded ${
                                        message.isHelpful === true
                                          ? 'bg-green-100 text-green-600'
                                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                      }`}
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleFAQFeedback(faq.id, false)}
                                      className={`p-1 rounded ${
                                        message.isHelpful === false
                                          ? 'bg-red-100 text-red-600'
                                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      }`}
                                    >
                                      <ThumbsDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isSearching && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm">Searching for answers...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
                
                {/* Can't Find Answer */}
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div className="p-6 border-t bg-gray-50">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <h4 className="font-medium text-gray-900 mb-2">
                        Couldn't find what you're looking for?
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Our support team is here to help with personalized assistance.
                      </p>
                      <button
                        onClick={handleEscalateToContact}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Us Section */}
        {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Contact Our Support Team
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Can't find what you're looking for? Send us a message and we'll get back to you within 24-48 hours.
                </p>
                
                {escalatedFromFaq && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      📋 We've noted that you searched our FAQ first. This helps us provide better support!
                    </p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleContactSubmit} className="p-6 space-y-6">
                {/* Success Message */}
                {submitStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-green-900">Message Sent Successfully!</h4>
                        <p className="text-sm text-green-700 mt-1">{submitMessage}</p>
                        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Expected response time: 24-48 hours
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-red-900">Submission Failed</h4>
                        <p className="text-sm text-red-700 mt-1">{submitMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => handleContactFormChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Your full name"
                    />
                    {fieldErrors.name && (
                      <p className="text-sm text-red-600 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => handleContactFormChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => handleContactFormChange('subject', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.subject ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Brief description of your inquiry"
                  />
                  {fieldErrors.subject && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.subject}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => handleContactFormChange('message', e.target.value)}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                      fieldErrors.message ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Please provide detailed information about your question or issue. The more details you provide, the better we can help you. (Minimum 50 characters)"
                  />
                  <div className="flex justify-between items-center mt-1">
                    {fieldErrors.message ? (
                      <p className="text-sm text-red-600">{fieldErrors.message}</p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {contactForm.message.length}/50 minimum characters
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-gray-500">
                    * Required fields
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || submitStatus === 'success'}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Additional Help */}
            <div className="mt-8 text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Other Ways to Get Help
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Browse Documentation</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Check out our comprehensive guides and tutorials.
                  </p>
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
                  >
                    View Docs
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Community Forum</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Connect with other users and get community support.
                  </p>
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
                  >
                    Join Forum
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
      </div>
    </div>
  );
}