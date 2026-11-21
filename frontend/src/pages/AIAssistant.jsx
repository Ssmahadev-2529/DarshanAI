import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Compass, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  Building2, 
  AlertTriangle, 
  ChevronRight, 
  Plus, 
  MessageSquare, 
  ExternalLink,
  Zap,
  Info,
  CheckCircle2,
  Boxes
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { label: 'Multi-Temple Comparison', query: 'Compare temples across Somnath, Tirupati, Meenakshi, and Kashi Vishwanath.' },
  { label: 'Highest Festival Surge', query: 'Which festival brings the most crowd surge multiplier?' },
  { label: 'Festival Peak Hours', query: 'What are the peak hours during festival days?' },
  { label: 'Upcoming Festivals', query: 'What are the upcoming verified temple festivals?' },
  { label: 'Metric Limitations', query: 'What metrics cannot be compared across temples and why?' },
  { label: 'Highest Observed Crowd', query: 'Which temple currently has the highest observed crowd count?' },
  { label: 'Most Congested Zone', query: 'Which zone has the highest recorded congestion?' },
  { label: '30-Min AI Forecast', query: 'What is the predicted crowd condition after 30 minutes?' },
  { label: 'Entrances & Wait Times', query: 'Which entrances require attention?' },
  { label: 'Emergency Facilities', query: 'What are the available emergency facilities near this temple?' },
  { label: 'Recurring Bottlenecks', query: 'Which areas have repeated congestion?' },
  { label: 'Evacuation Corridors', query: 'Which verified emergency routes are available?' },
  { label: 'Operational Health Briefing', query: 'Give me a summary of the selected temple current operational condition.' }
];

const AIAssistant = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [temples, setTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load Temples List
  useEffect(() => {
    const fetchTemples = async () => {
      try {
        const res = await API.get('/temples');
        const list = Array.isArray(res.data) ? res.data : (res.data?.temples || []);
        setTemples(list);
        if (list.length > 0 && !selectedTempleId) {
          setSelectedTempleId(list[0].temple_id);
        }
      } catch (err) {
        console.error('Failed to load temples:', err);
      }
    };
    fetchTemples();
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await API.get('/ai/conversations');
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);
      if (list.length > 0 && !currentConversationId) {
        loadConversationDetails(list[0].conversation_id);
      } else if (list.length === 0) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadConversationDetails = async (convId) => {
    setLoadingHistory(true);
    setCurrentConversationId(convId);
    try {
      const res = await API.get(`/ai/conversations/${convId}`);
      setMessages(res.data?.messages || []);
      if (res.data?.temple_id) {
        setSelectedTempleId(res.data.temple_id);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now().toString(36)}`;
    setCurrentConversationId(newId);
    setMessages([
      {
        role: 'assistant',
        content: `**Namaste! I am the DarshanAI Grounded Analytics Assistant.**\n\nI provide empirical insights regarding live crowd observations, Random Forest 30-minute forecasts, verified evacuation corridors, and emergency facility logistics for **${activeTemple.name}**.\n\n*All statistics are strictly grounded in live database measurements and certified municipal master plans.*`,
        sources_cited: ['DarshanAI Data Verification Registry'],
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleSendMessage = async (msgText = null) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend || !textToSend.trim() || isSending) return;

    const userTurn = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userTurn]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await API.post('/ai/chat', {
        message: textToSend.trim(),
        conversation_id: currentConversationId,
        temple_id: selectedTempleId
      });

      const assistantTurn = {
        role: 'assistant',
        content: res.data.answer,
        intent_detected: res.data.intent,
        sources_cited: res.data.sources_cited,
        zone_to_highlight: res.data.zone_to_highlight,
        model_used: res.data.model_used,
        timestamp: res.data.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantTurn]);
      loadConversations();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ *An error occurred while querying the grounded analytics database. Please ensure the backend service is operational.*',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const activeTemple = temples.find(t => t.temple_id === selectedTempleId) || { name: 'Sri Somnath Jyotirlinga Temple', city: 'Prabhas Patan' };

  return (
    <div className="container-fluid p-0" style={{ backgroundColor: '#F9F6F0', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      <div className="row g-0 h-100">
        {/* Left Consultation Session Sidebar */}
        <div className="col-12 col-md-3 border-end bg-white d-flex flex-column h-100" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-bold m-0 text-maroon d-flex align-items-center gap-2">
              <Sparkles size={16} className="text-warning" /> AI Consultations
            </h6>
            <button 
              className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1 shadow-sm"
              onClick={startNewConversation}
              title="Start a new analytical consultation"
            >
              <Plus size={14} /> New
            </button>
          </div>

          {/* Temple Selector in Sidebar */}
          <div className="p-3 border-bottom bg-light">
            <label className="form-label small fw-semibold text-muted mb-1">Active Temple Context:</label>
            <select 
              className="form-select form-select-sm border-saffron fw-semibold text-maroon"
              value={selectedTempleId}
              onChange={(e) => {
                setSelectedTempleId(e.target.value);
                startNewConversation();
              }}
            >
              {temples.map(t => (
                <option key={t.temple_id} value={t.temple_id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session List */}
          <div className="flex-grow-1 overflow-auto p-2">
            <small className="text-muted fw-bold px-2 py-1 d-block" style={{ fontSize: '0.68rem' }}>
              RECENT SESSIONS
            </small>
            <div className="d-flex flex-column gap-1">
              {conversations.map(c => {
                const isSelected = c.conversation_id === currentConversationId;
                return (
                  <button
                    key={c.conversation_id}
                    className={`btn text-start p-2 rounded-3 text-truncate w-100 transition-all ${isSelected ? 'btn-maroon text-white fw-semibold shadow-sm' : 'btn-light border-0 text-dark'}`}
                    style={{ fontSize: '0.80rem' }}
                    onClick={() => loadConversationDetails(c.conversation_id)}
                  >
                    <MessageSquare size={13} className="inline me-2" />
                    {c.title || 'Temple Analytics Consultation'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Provenance Footer */}
          <div className="p-3 border-top bg-light small text-muted" style={{ fontSize: '0.70rem' }}>
            <div className="d-flex align-items-center gap-1 mb-1">
              <span className="badge bg-success bg-opacity-25 text-success p-1">●</span>
              <strong className="text-dark">DARSHAN-GROUNDED-ENGINE</strong>
            </div>
            <span>Strict Zero-Hallucination Policy. Unrestricted raw SQL execution prohibited.</span>
          </div>
        </div>

        {/* Right Main Chat Window */}
        <div className="col-12 col-md-9 d-flex flex-column h-100 bg-ivory" style={{ backgroundColor: '#F9F6F0' }}>
          {/* Top Chat Bar */}
          <div className="p-3 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center">
            <div>
              <div className="d-flex align-items-center gap-2">
                <Bot size={20} className="text-maroon" />
                <h5 className="fw-bold m-0 text-maroon">
                  DarshanAI Natural Language Analytics Assistant
                </h5>
                <span className="badge bg-primary bg-opacity-10 text-primary border" style={{ fontSize: '0.68rem' }}>
                  Grounded LLM
                </span>
              </div>
              <small className="text-muted">
                Target: <strong>{activeTemple.name}</strong> • Querying live CCTV observations, ML predictions, and PostGIS infrastructure.
              </small>
            </div>

            <button 
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
              onClick={() => navigate('/digital-twin')}
            >
              <Boxes size={14} /> Open 3D Twin
            </button>
          </div>

          {/* Quick Prompt Carousel / Suggestion Pills */}
          <div className="p-2 bg-white border-bottom d-flex gap-2 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
            <span className="small text-muted align-self-center px-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
              Suggested:
            </span>
            {SUGGESTED_PROMPTS.map((sp, idx) => (
              <button
                key={idx}
                className="btn btn-sm btn-light border rounded-pill px-3 py-1 shadow-xs text-dark hover-bg-saffron"
                style={{ fontSize: '0.74rem' }}
                onClick={() => handleSendMessage(sp.query)}
                disabled={isSending}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Message Thread */}
          <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`d-flex gap-3 ${isAssistant ? 'justify-content-start' : 'justify-content-end'}`}
                >
                  {isAssistant && (
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                      style={{ width: '36px', height: '36px', backgroundColor: '#800000', color: '#FFF' }}
                    >
                      <Bot size={18} />
                    </div>
                  )}

                  <div 
                    className={`rounded-3 p-3 shadow-sm ${isAssistant ? 'bg-white text-dark border' : 'bg-maroon text-white'}`}
                    style={{ 
                      maxWidth: '82%', 
                      borderColor: '#E5E7EB',
                      lineHeight: '1.5'
                    }}
                  >
                    {/* Render message content with formatted lines */}
                    <div 
                      className="small" 
                      style={{ 
                        fontSize: '0.88rem', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word' 
                      }}
                    >
                      {m.content}
                    </div>

                    {/* Zone 3D Highlight Action Button */}
                    {isAssistant && m.zone_to_highlight && (
                      <div className="mt-2 pt-2 border-top">
                        <button 
                          className="btn btn-sm btn-outline-info text-dark d-flex align-items-center gap-1 py-1 px-2"
                          style={{ fontSize: '0.75rem', backgroundColor: '#E0F2FE' }}
                          onClick={() => navigate('/digital-twin')}
                        >
                          <Boxes size={13} className="text-primary" /> Highlight {m.zone_to_highlight} in 3D Holographic Twin
                        </button>
                      </div>
                    )}

                    {/* Provenance Citations Footer */}
                    {isAssistant && m.sources_cited && m.sources_cited.length > 0 && (
                      <div className="mt-2 pt-2 border-top d-flex flex-wrap gap-1 align-items-center" style={{ fontSize: '0.68rem' }}>
                        <span className="text-muted fw-semibold">Citations:</span>
                        {m.sources_cited.map((src, i) => (
                          <span key={i} className="badge bg-secondary bg-opacity-10 text-dark border">
                            <ShieldCheck size={10} className="inline me-1 text-success" />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="d-flex justify-content-end mt-1">
                      <small className={`${isAssistant ? 'text-muted' : 'text-white-50'}`} style={{ fontSize: '0.62rem' }}>
                        <Clock size={10} className="inline me-1" />
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'Just now'}
                      </small>
                    </div>
                  </div>

                  {!isAssistant && (
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                      style={{ width: '36px', height: '36px', backgroundColor: '#D97706', color: '#FFF' }}
                    >
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="d-flex gap-3 justify-content-start">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                  style={{ width: '36px', height: '36px', backgroundColor: '#800000', color: '#FFF' }}
                >
                  <Bot size={18} />
                </div>
                <div className="rounded-3 p-3 bg-white border shadow-sm small text-muted d-flex align-items-center gap-2">
                  <span className="spin-anim"><Sparkles size={16} className="text-warning" /></span>
                  Querying verified analytics telemetry & ground truth records...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-top shadow-sm">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="d-flex gap-2"
            >
              <input 
                type="text" 
                className="form-control shadow-sm border-saffron"
                placeholder={`Ask an analytical question regarding ${activeTemple.name} (e.g. crowd count, predictions, routes)...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
                style={{ fontSize: '0.88rem' }}
              />

              <button 
                type="submit" 
                className="btn btn-maroon px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                disabled={isSending || !inputMessage.trim()}
              >
                <Send size={15} />
                <span className="d-none d-sm-inline">Query</span>
              </button>
            </form>
            <div className="d-flex justify-content-between align-items-center mt-2 px-1 text-muted" style={{ fontSize: '0.68rem' }}>
              <span>Deterministic Grounded Analytical Engine Active • Privacy Guaranteed</span>
              <span>Press Enter to Query</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
