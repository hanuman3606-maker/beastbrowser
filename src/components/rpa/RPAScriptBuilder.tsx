import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Save, 
  Code, 
  Globe, 
  Clock, 
  Settings, 
  Plus, 
  Trash2, 
  Copy,
  Eye,
  Download,
  Upload,
  Zap,
  MousePointer,
  Type,
  Scroll,
  Camera,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface RPAScript {
  id: string;
  name: string;
  description: string;
  executionTime: number; // in minutes
  scriptType: 'javascript' | 'custom' | 'template';
  scriptContent: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
  category?: string;
  tags?: string[];
}

interface ScriptStep {
  id: string;
  type: 'navigate' | 'click' | 'input' | 'scroll' | 'wait' | 'execute_js' | 'screenshot';
  name: string;
  config: Record<string, any>;
  order: number;
  enabled: boolean;
}

const RPAScriptBuilder: React.FC = () => {
  const [scripts, setScripts] = useState<RPAScript[]>([]);
  const [currentScript, setCurrentScript] = useState<RPAScript | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [scriptSteps, setScriptSteps] = useState<ScriptStep[]>([]);
  const [activeTab, setActiveTab] = useState('builder');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [executionTime, setExecutionTime] = useState(5);
  const [scriptType, setScriptType] = useState<'javascript' | 'custom' | 'template'>('javascript');
  const [scriptContent, setScriptContent] = useState('');

  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Load scripts from localStorage on component mount
  useEffect(() => {
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    if (savedScripts) {
      try {
        const parsedScripts = JSON.parse(savedScripts);
        console.log('✅ Loaded RPA scripts:', parsedScripts.length);
        setScripts(parsedScripts);
        
        // If no scripts exist, create defaults
        if (parsedScripts.length === 0) {
          console.log('📝 No scripts found, creating defaults...');
          createDefaultScripts();
        }
      } catch (error) {
        console.error('Failed to parse RPA scripts:', error);
        // Create default scripts on error
        createDefaultScripts();
      }
    } else {
      console.log('📝 No saved scripts found - creating defaults');
      // Create default pre-built scripts automatically
      createDefaultScripts();
    }
  }, []);

  // Function to create default pre-built scripts
  const createDefaultScripts = () => {
    const defaultScripts: RPAScript[] = [
      {
        id: `script_${Date.now()}_smooth`,
        name: scriptTemplates.smoothContinuous.name,
        description: scriptTemplates.smoothContinuous.description,
        executionTime: 2,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.smoothContinuous.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_fast`,
        name: scriptTemplates.fastScroll.name,
        description: scriptTemplates.fastScroll.description,
        executionTime: 2,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.fastScroll.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_slow`,
        name: scriptTemplates.slowReading.name,
        description: scriptTemplates.slowReading.description,
        executionTime: 3,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.slowReading.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_random`,
        name: scriptTemplates.randomJumps.name,
        description: scriptTemplates.randomJumps.description,
        executionTime: 2,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.randomJumps.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_pause`,
        name: scriptTemplates.pauseScroll.name,
        description: scriptTemplates.pauseScroll.description,
        executionTime: 3,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.pauseScroll.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_bounce`,
        name: scriptTemplates.bounceScroll.name,
        description: scriptTemplates.bounceScroll.description,
        executionTime: 2,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.bounceScroll.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_click`,
        name: scriptTemplates.randomClicking.name,
        description: scriptTemplates.randomClicking.description,
        executionTime: 5,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.randomClicking.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_clicker`,
        name: scriptTemplates.clicker.name,
        description: scriptTemplates.clicker.description,
        executionTime: 3,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.clicker.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_form`,
        name: scriptTemplates.formFiller.name,
        description: scriptTemplates.formFiller.description,
        executionTime: 2,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.formFiller.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
      },
      {
        id: `script_${Date.now()}_webscroll`,
        name: scriptTemplates.webScroll.name,
        description: scriptTemplates.webScroll.description,
        executionTime: 3,
        scriptType: 'javascript',
        scriptContent: scriptTemplates.webScroll.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0,
        category: 'scrolling'
      }
    ];
    
    console.log('🚀 Creating', defaultScripts.length, 'pre-built scripts');
    setScripts(defaultScripts);
    localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(defaultScripts));
    
    // Trigger event so Profile Manager can refresh
    window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { 
      detail: { count: defaultScripts.length } 
    }));
  };

  // Save scripts to localStorage whenever scripts change
  useEffect(() => {
    if (scripts.length >= 0) { // Save even if empty to keep state synced
      localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(scripts));
      console.log('💾 Saved', scripts.length, 'RPA scripts to localStorage');
      
      // Trigger event so Profile Manager can refresh
      window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { 
        detail: { count: scripts.length } 
      }));
    }
  }, [scripts]);

  // Pre-built script templates - Multiple scrolling patterns
  const scriptTemplates = {
    smoothContinuous: {
      name: '🔄 Smooth Scroll Down-Up',
      description: 'Scrolls to bottom then top (2 sec delay)',
      content: `console.log('🔄 [Smooth Scroll] Script loaded - waiting 2 seconds...');

setTimeout(function() {
    console.log('🔄 [Smooth Scroll] Starting!');
    
    function scrollToBottom() {
        console.log('⬇️ [Smooth Scroll] Scrolling to BOTTOM...');
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    function scrollToTop() {
        console.log('⬆️ [Smooth Scroll] Scrolling to TOP...');
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Scroll down
    scrollToBottom();
    
    // After 3 seconds, scroll up
    setTimeout(function() {
        scrollToTop();
        console.log('✅ [Smooth Scroll] Complete!');
    }, 3000);
    
}, 2000);`
    },
    fastScroll: {
      name: '⚡ Fast Aggressive Scroll',
      description: 'Fast aggressive scrolling (5 sec delay)',
      content: `console.log('⚡ Fast Aggressive Scroll starting in 5 seconds...');

setTimeout(() => {
    console.log('✅ Starting fast scrolling!');
    let direction = 1;
    const scrollSpeed = 25;
    const scrollInterval = 10;
    let isScrolling = true;

    function fastScroll() {
        if (!isScrolling) return;
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const currentPos = window.scrollY;

        if (currentPos >= maxHeight && direction === 1) {
            direction = -1;
            console.log('⚡ Reached bottom, fast scroll UP');
        } else if (currentPos <= 0 && direction === -1) {
            direction = 1;
            console.log('⚡ Reached top, fast scroll DOWN');
        }

        window.scrollBy({ top: scrollSpeed * direction, behavior: 'auto' });
        setTimeout(fastScroll, scrollInterval);
    }

    fastScroll();
    window.addEventListener('wheel', () => { isScrolling = false; });
}, 5000);`
    },
    slowReading: {
      name: '📖 Slow Reading Scroll',
      description: 'Slow reading-like scroll (2 sec delay)',
      content: `console.log('📖 Slow Reading Scroll starting in 2 seconds...');

setTimeout(() => {
    console.log('✅ Starting slow reading scroll!');
    let isScrolling = true;

    function slowReadScroll() {
        if (!isScrolling) return;
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const currentPos = window.scrollY;

        if (currentPos >= maxHeight) {
            console.log('📖 Reached end of page');
            return;
        }

        window.scrollBy({ top: 3, behavior: 'smooth' });
        setTimeout(slowReadScroll, 50);
    }

    slowReadScroll();
    window.addEventListener('wheel', () => { isScrolling = false; });
}, 2000);`
    },
    randomJumps: {
      name: '🎲 Random Jump Scroll',
      description: 'Random jumps throughout the page (4 sec delay)',
      content: `console.log('🎲 Random Jump Scroll starting in 4 seconds...');

setTimeout(() => {
    console.log('✅ Starting random jump scrolling!');
    let isScrolling = true;
    let jumpCount = 0;

    function randomJump() {
        if (!isScrolling || jumpCount >= 20) return;
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const randomPosition = Math.random() * maxHeight;
        
        window.scrollTo({ top: randomPosition, behavior: 'smooth' });
        console.log('🎲 Jumped to position:', Math.floor(randomPosition));
        jumpCount++;
        
        setTimeout(randomJump, 2000 + Math.random() * 2000);
    }

    randomJump();
    window.addEventListener('wheel', () => { isScrolling = false; });
}, 4000);`
    },
    pauseScroll: {
      name: '⏸️ Scroll with Pauses',
      description: 'Scrolls down with realistic pauses (3 sec delay)',
      content: `console.log('⏸️ Scroll with Pauses starting in 3 seconds...');

setTimeout(() => {
    console.log('✅ Starting scroll with pauses!');
    let isScrolling = true;
    let scrollPhase = 0;

    function pauseScroll() {
        if (!isScrolling) return;
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const currentPos = window.scrollY;

        if (currentPos >= maxHeight) {
            console.log('⏸️ Reached end');
            return;
        }

        // Scroll for a bit
        const scrollAmount = 200 + Math.random() * 300;
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        console.log('⏸️ Scrolled, now pausing...');
        
        // Pause for 2-5 seconds
        const pauseTime = 2000 + Math.random() * 3000;
        setTimeout(pauseScroll, pauseTime);
    }

    pauseScroll();
    window.addEventListener('wheel', () => { isScrolling = false; });
}, 3000);`
    },
    bounceScroll: {
      name: '🏀 Bounce Scroll',
      description: 'Bounces up and down sections (6 sec delay)',
      content: `console.log('🏀 Bounce Scroll starting in 6 seconds...');

setTimeout(() => {
    console.log('✅ Starting bounce scrolling!');
    let isScrolling = true;
    let bounceCount = 0;

    function bounceScroll() {
        if (!isScrolling || bounceCount >= 15) return;
        
        // Scroll down
        window.scrollBy({ top: 400, behavior: 'smooth' });
        console.log('🏀 Bounce down');
        
        setTimeout(() => {
            if (!isScrolling) return;
            // Scroll up a bit
            window.scrollBy({ top: -200, behavior: 'smooth' });
            console.log('🏀 Bounce up');
            bounceCount++;
            setTimeout(bounceScroll, 1500);
        }, 800);
    }

    bounceScroll();
    window.addEventListener('wheel', () => { isScrolling = false; });
}, 6000);`
    },
    randomClicking: {
      name: 'Random Clicking Script',
      description: 'Performs random clicks and scrolling to simulate human behavior',
      content: `setTimeout(() => {
    let isActive = true;
    let clickCount = 0;
    const maxClicks = 20; // Maximum number of clicks
    
    function getRandomElement() {
        const clickableElements = document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]');
        const visibleElements = Array.from(clickableElements).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && 
                   rect.top >= 0 && rect.left >= 0 && 
                   rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        });
        
        if (visibleElements.length === 0) return null;
        return visibleElements[Math.floor(Math.random() * visibleElements.length)];
    }
    
    function performRandomAction() {
        if (!isActive || clickCount >= maxClicks) return;
        
        const action = Math.random();
        
        if (action < 0.3) {
            // Random scroll
            const scrollAmount = Math.random() * 500 + 100;
            const direction = Math.random() > 0.5 ? 1 : -1;
        window.scrollBy({
                top: scrollAmount * direction,
            behavior: 'smooth'
        });
        } else if (action < 0.7) {
            // Random click
            const element = getRandomElement();
            if (element) {
                element.click();
                clickCount++;
                console.log('Random click performed on:', element.tagName, element.className);
            }
        } else {
            // Random pause
            const pauseTime = Math.random() * 3000 + 1000; // 1-4 seconds
            setTimeout(() => {
                if (isActive) performRandomAction();
            }, pauseTime);
            return;
        }
        
        // Schedule next action
        const nextActionDelay = Math.random() * 2000 + 500; // 0.5-2.5 seconds
        setTimeout(performRandomAction, nextActionDelay);
    }
    
    // Start after 5 seconds
    setTimeout(() => {
        performRandomAction();
    }, 5000);

    // Stop on user interaction
    window.addEventListener('click', () => {
        isActive = false;
    });
    
    window.addEventListener('scroll', () => {
        isActive = false;
    });
    
}, 5000);`
    },
    clicker: {
      name: 'Auto Clicker Script',
      description: 'Automatically clicks on specific elements',
      content: `setTimeout(() => {
    const clickSelectors = [
        '.like-button',
        '.follow-button',
        '.subscribe-button',
        '[data-testid="like"]',
        '.heart-icon',
        '.btn-like',
        '.vote-button'
    ];

    function clickElements() {
        clickSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !element.disabled) {
                    element.click();
                    console.log('Clicked element:', selector);
                }
            });
        });
    }

    // Click every 5 seconds
    setInterval(clickElements, 5000);
}, 3000);`
    },
    formFiller: {
      name: 'Form Filler Script',
      description: 'Automatically fills form fields with sample data (with proper focus)',
      content: `setTimeout(() => {
    const sampleData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        message: 'This is an automated test message.'
    };

    async function typeIntoInput(input, text) {
        // Focus the input properly
        input.focus();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Click to ensure focus
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clear existing value
        input.value = '';
        
        // Type character by character for realistic behavior
        for (let char of text) {
            input.value += char;
            
            // Dispatch all necessary events
            input.dispatchEvent(new Event('keydown', { bubbles: true }));
            input.dispatchEvent(new Event('keypress', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            input.dispatchEvent(new Event('keyup', { bubbles: true }));
            
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
        }
        
        // Blur to trigger validation
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        
        console.log('✅ Filled:', input.name || input.id || 'input', '=', text);
    }

    async function fillForms() {
        console.log('📝 Starting form filling...');
        
        // Fill text inputs
        const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])');
        for (let input of textInputs) {
            if (input.name.toLowerCase().includes('name') || input.id.toLowerCase().includes('name')) {
                await typeIntoInput(input, sampleData.name);
            } else if (input.name.toLowerCase().includes('email') || input.id.toLowerCase().includes('email')) {
                await typeIntoInput(input, sampleData.email);
            } else if (input.name.toLowerCase().includes('phone') || input.id.toLowerCase().includes('phone')) {
                await typeIntoInput(input, sampleData.phone);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Fill textareas
        const textareas = document.querySelectorAll('textarea');
        for (let textarea of textareas) {
            await typeIntoInput(textarea, sampleData.message);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('✅ Form filling complete!');
    }

    fillForms();
}, 2000);`
    },
    webScroll: {
      name: '🌐 Web Scroll',
      description: 'Continuous scrolling - Top to Bottom to Top (repeats forever!)',
      content: `console.log('🌐 [CONTINUOUS SCROLL] Loading...');
console.log('⏰ Will start in 10 seconds...');

setTimeout(() => {
    console.log('🚀 [CONTINUOUS SCROLL] STARTING NOW!');
    
    // Continuous scrolling logic: top to bottom, bottom to top
    let direction = 1; // 1 for down, -1 for up
    const scrollSpeed = 10; // Increased speed for faster scrolling
    const scrollInterval = 16; // ~60fps
    let isScrolling = true;

    function continuousScroll() {
        if (!isScrolling) {
            console.log('⏸️ [CONTINUOUS SCROLL] Stopped by user interaction');
            return;
        }

        const maxHeight = document.body.scrollHeight - window.innerHeight; // Full page height
        const currentPos = window.scrollY;

        // Reverse direction at top or bottom
        if (currentPos >= maxHeight && direction === 1) {
            direction = -1; // Reverse to scroll up
            console.log('⬆️ [CONTINUOUS SCROLL] Reached BOTTOM, going UP');
        } else if (currentPos <= 0 && direction === -1) {
            direction = 1; // Reverse to scroll down
            console.log('⬇️ [CONTINUOUS SCROLL] Reached TOP, going DOWN');
        }

        window.scrollBy({
            top: scrollSpeed * direction,
            behavior: 'smooth'
        });

        // Continue scrolling
        setTimeout(continuousScroll, scrollInterval);
    }

    // Start scrolling
    continuousScroll();
    console.log('✅ [CONTINUOUS SCROLL] Animation loop started!');
    console.log('💡 Scrolling will continue forever - top to bottom to top!');
    console.log('🛑 Use mouse wheel or touch to stop');

    // Stop scrolling on user interaction
    window.addEventListener('wheel', () => {
        if (isScrolling) {
            console.log('🛑 [CONTINUOUS SCROLL] Stopped by wheel event');
            isScrolling = false;
        }
    });
    
    window.addEventListener('touchstart', () => {
        if (isScrolling) {
            console.log('🛑 [CONTINUOUS SCROLL] Stopped by touch event');
            isScrolling = false;
        }
    });

    // Optional: Functions to manually trigger top/bottom scroll
    window.scrollToTop = function() {
        console.log('⬆️ Manual scroll to top');
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        isScrolling = false;
    };

    window.scrollToBottom = function() {
        console.log('⬇️ Manual scroll to bottom');
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
        isScrolling = false;
    };
    
    console.log('💡 Type scrollToTop() or scrollToBottom() in console to manually control');
    
}, 10000); // Initial 10-second delay`
    }
  };

  const handleCreateNewScript = () => {
    console.log('🆕 Creating new script...');
    const newScript: RPAScript = {
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      description: '',
      executionTime: 5,
      scriptType: 'javascript',
      scriptContent: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      executionCount: 0
    };

    setCurrentScript(newScript);
    setIsEditing(true);
    setScriptName('');
    setScriptDescription('');
    setExecutionTime(5);
    setScriptType('javascript');
    setScriptContent('');
    setActiveTab('builder');
    
    console.log('✅ New script form opened, isEditing:', true);
  };

  const handleSaveScript = async () => {
    if (!scriptName.trim()) {
      toast.error('Please enter a script name');
      return;
    }
    
    if (!scriptContent.trim()) {
      toast.error('Please enter script content');
      return;
    }

    setIsSaving(true);

    try {
      const scriptToSave: RPAScript = {
        id: currentScript?.id || `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: scriptName,
        description: scriptDescription,
        executionTime: executionTime,
        scriptType: scriptType,
        scriptContent: scriptContent,
        createdAt: currentScript?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: currentScript?.executionCount || 0
      };

        // DEBUG: Log exactly what we're saving
        console.log('🔍 SAVING SCRIPT WITH VALUES:', {
            id: scriptToSave.id,
            name: scriptToSave.name,
            scriptContent: scriptToSave.scriptContent?.substring(0, 50) + '...',
            scriptContentLength: scriptToSave.scriptContent?.length || 0,
            hasScriptContent: !!scriptToSave.scriptContent,
            executionTime: scriptToSave.executionTime,
            scriptType: scriptToSave.scriptType
        });

      let updatedScripts: RPAScript[];
      
      // Check if this script actually exists in the scripts array
      const existingScriptIndex = scripts.findIndex(s => s.id === currentScript?.id);
      
      if (currentScript && existingScriptIndex !== -1) {
        // Update existing script (script exists in array)
        updatedScripts = scripts.map(s => s.id === currentScript.id ? scriptToSave : s);
        console.log('✅ Script updated:', scriptToSave.name);
        toast.success('Script updated successfully');
      } else {
        // Add new script (script doesn't exist in array or no currentScript)
        updatedScripts = [...scripts, scriptToSave];
        console.log('✅ New script created:', scriptToSave.name, '| Total scripts:', updatedScripts.length);
        toast.success('Script saved successfully');
      }

      // CRITICAL: Save to state AND localStorage
      setScripts(updatedScripts);
      localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
      console.log('💾 Saved to localStorage:', updatedScripts.length, 'scripts');
      
      // VERIFY: Check what was actually saved to localStorage
      const verifyScript = updatedScripts[updatedScripts.length - 1];
      console.log('✅ VERIFICATION - Last script in array:', {
        name: verifyScript.name,
        scriptContentLength: verifyScript.scriptContent?.length || 0,
        hasScriptContent: !!verifyScript.scriptContent
      });
      
      // Trigger event so other components update
      window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { 
        detail: { count: updatedScripts.length } 
      }));

      // Reset form
      setCurrentScript(null);
      setIsEditing(false);
      setScriptName('');
      setScriptDescription('');
      setWebsiteUrl('');
      setExecutionTime(5);
      setScriptType('javascript');
      setScriptContent('');
      setActiveTab('builder');
    } catch (error) {
      toast.error('Failed to save script');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScript = (script: RPAScript) => {
    setCurrentScript(script);
    setScriptName(script.name);
    setScriptDescription(script.description);
    setExecutionTime(script.executionTime);
    setScriptType(script.scriptType);
    setScriptContent(script.scriptContent);
    setIsEditing(true);
    setActiveTab('builder');
  };

  const handleDeleteScript = (scriptId: string) => {
    if (!confirm('Are you sure you want to delete this script?')) {
      return;
    }

    const updatedScripts = scripts.filter(s => s.id !== scriptId);
    
    // Update state AND localStorage
    setScripts(updatedScripts);
    localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
    console.log('🗑️ Script deleted, remaining:', updatedScripts.length);
    
    // Trigger event
    window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { 
      detail: { count: updatedScripts.length } 
    }));
    
    if (currentScript?.id === scriptId) {
      setCurrentScript(null);
      setIsEditing(false);
    }
    
    toast.success('Script deleted successfully');
  };

  const handleCopyScript = (script: RPAScript) => {
    navigator.clipboard.writeText(script.scriptContent);
    toast.success('Script copied to clipboard');
  };

  const handleExportScript = (script: RPAScript) => {
    const dataStr = JSON.stringify(script, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Script exported successfully');
  };

  const handleImportScript = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedScript = JSON.parse(e.target?.result as string);
        // Generate new ID to avoid conflicts
        importedScript.id = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        importedScript.createdAt = new Date().toISOString();
        importedScript.updatedAt = new Date().toISOString();
        
        const updatedScripts = [...scripts, importedScript];
        setScripts(updatedScripts);
        localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
        
        window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { 
          detail: { count: updatedScripts.length } 
        }));
        
        toast.success('Script imported successfully');
      } catch (error) {
        toast.error('Invalid script file');
      }
    };
    reader.readAsText(file);
  };

  const validateScript = () => {
    if (!scriptName.trim()) return 'Script name is required';
    if (!scriptContent.trim()) return 'Script content is required';
    if (scriptType === 'javascript') {
      try {
        // Basic JavaScript validation
        new Function(scriptContent);
      } catch (error) {
        return 'Invalid JavaScript syntax';
      }
    }
    return null;
  };

  // DON'T validate on every render - only when needed
  // const validationError = validateScript();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RPA Script Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage automation scripts for your browser profiles
          </p>
        </div>
        <div className="flex gap-2">
          {scripts.length > 0 && (
            <Button 
              variant="destructive"
              onClick={() => {
                if (confirm(`⚠️ DELETE ALL ${scripts.length} scripts?\n\nThis will permanently delete all your automation scripts. This action cannot be undone!`)) {
                  setScripts([]);
                  localStorage.setItem('antidetect_rpa_scripts', JSON.stringify([]));
                  window.dispatchEvent(new CustomEvent('rpa-scripts-updated', { detail: { count: 0 } }));
                  setCurrentScript(null);
                  setIsEditing(false);
                  toast.success('All scripts deleted');
                  console.log('🗑️ All scripts cleared from localStorage');
                }
              }}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All ({scripts.length})
            </Button>
          )}
          <Button onClick={handleCreateNewScript} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Script
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportScript}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Instructions Card */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          <strong>🎯 Quick Guide - Create & Run RPA Script:</strong>
          <div className="mt-2 space-y-1">
            <p><strong>1. Create Script:</strong> Click "New Script" → Enter name & paste code → Save</p>
            <p><strong>2. Run Script:</strong> Go to Profiles tab → Select profile → "Execute RPA"</p>
            <p><strong>3. Enter URL:</strong> Type website URL in profile's Starter URL field</p>
            <p><strong>4. Auto-Close:</strong> Browser closes after execution time (e.g., 5 minutes)</p>
          </div>
          <div className="mt-3 p-2 bg-green-50 rounded border border-green-300">
            <strong>✅ 10 Pre-built Scripts Available!</strong>
            <p className="mt-1 text-xs">Smooth scrolling, clicking, form filling scripts ready to use!</p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Script Library */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Script Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {scripts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No scripts created yet</p>
                      <p className="text-sm">Create your first automation script</p>
                    </div>
                  ) : (
                    scripts.map((script) => (
                      <div
                        key={script.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          currentScript?.id === script.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleLoadScript(script)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{script.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {script.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {script.executionCount} runs
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {script.executionTime}min
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyScript(script);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportScript(script);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScript(script.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Script Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {isEditing ? 'Edit Script' : 'Script Builder'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="text-center py-16">
                  <Code className="h-20 w-20 mx-auto mb-6 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-3">No Script Selected</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    {scripts.length > 0 
                      ? 'Select a script from the library to edit, or create a new automation script'
                      : 'Get started by creating your first automation script'
                    }
                  </p>
                  <Button onClick={handleCreateNewScript} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Script
                  </Button>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="builder">Script Builder</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  <TabsContent value="builder" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scriptName">Script Name *</Label>
                        <Input
                          id="scriptName"
                          type="text"
                          value={scriptName}
                          onChange={(e) => setScriptName(e.target.value)}
                          placeholder="Enter script name"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scriptDescription">Description</Label>
                      <Textarea
                        id="scriptDescription"
                        value={scriptDescription}
                        onChange={(e) => setScriptDescription(e.target.value)}
                        placeholder="Describe what this script does"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="executionTime">Execution Time (minutes) *</Label>
                        <Input
                          id="executionTime"
                          type="number"
                          value={executionTime}
                          onChange={(e) => setExecutionTime(Number(e.target.value))}
                          min="1"
                          max="60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scriptType">Script Type</Label>
                        <Select value={scriptType} onValueChange={(value: any) => setScriptType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scriptContent">Script Content</Label>
                      </div>
                      <Textarea
                        ref={codeEditorRef}
                        id="scriptContent"
                        value={scriptContent}
                        onChange={(e) => setScriptContent(e.target.value)}
                        placeholder="Enter your JavaScript code here..."
                        rows={15}
                        className="font-mono text-sm"
                        spellCheck={false}
                      />
                    </div>

                    {/* Validation happens on save - no need to show errors on every keystroke */}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveScript}
                        disabled={isSaving}
                        className="flex items-center gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Script
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Script Preview</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {scriptName || 'Untitled Script'}</div>
                        <div><strong>Execution Time:</strong> {executionTime} minutes</div>
                        <div><strong>Type:</strong> {scriptType}</div>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Script Content</h4>
                      <pre className="text-sm overflow-x-auto">
                        <code>{scriptContent || 'No script content'}</code>
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RPAScriptBuilder;
