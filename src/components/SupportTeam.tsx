import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Users,
  HeadphonesIcon,
  Instagram,
  Globe,
  Star,
  Zap,
  Shield,
  Settings,
  HelpCircle
} from 'lucide-react';

const SupportTeam: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const contactMethods = [
    {
      id: 'whatsapp1',
      name: 'WhatsApp Support',
      number: '+91 8177062435',
      description: 'Primary support line',
      icon: <MessageCircle className="h-6 w-6" />,
      color: 'bg-green-500',
      available: true,
      hours: '24/7 Available'
    },
    {
      id: 'whatsapp2',
      name: 'WhatsApp Support',
      number: '+91 79919 85013',
      description: 'Secondary support line',
      icon: <MessageCircle className="h-6 w-6" />,
      color: 'bg-green-500',
      available: true,
      hours: '24/7 Available'
    },
    {
      id: 'email',
      name: 'Email Support',
      email: 'beastbrowser7@gmail.com',
      description: 'For detailed queries',
      icon: <Mail className="h-6 w-6" />,
      color: 'bg-blue-500',
      available: true,
      hours: 'Response in 2-4 hours'
    }
  ];

  const socialLinks = [
    {
      id: 'whatsapp-channel',
      name: 'WhatsApp Channel',
      url: 'https://www.whatsapp.com/channel/0029VaiJXCH35fLpkTTrdW3F',
      description: 'Join our official updates channel',
      icon: <MessageCircle className="h-5 w-5" />,
      color: 'bg-green-500'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: 'https://www.instagram.com/beast_browser/#',
      description: 'Follow us for updates',
      icon: <Instagram className="h-5 w-5" />,
      color: 'bg-pink-500'
    }
  ];

  const supportFeatures = [
    {
      icon: <Zap className="h-6 w-6 text-yellow-500" />,
      title: '24/7 Support',
      description: 'Round the clock assistance for urgent issues'
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-500" />,
      title: 'Expert Team',
      description: 'Professional support agents with deep technical knowledge'
    },
    {
      icon: <Clock className="h-6 w-6 text-green-500" />,
      title: 'Quick Response',
      description: 'Average response time under 30 minutes'
    },
    {
      icon: <Users className="h-6 w-6 text-purple-500" />,
      title: 'Multi-language',
      description: 'Support available in English, Hindi & other languages'
    }
  ];

  const handleContactClick = (method: any) => {
    if (method.number) {
      // WhatsApp click
      const message = encodeURIComponent("Hi! I need help with BeastBrowser. Can you assist me?");
      window.open(`https://wa.me/${method.number.replace(/\s/g, '').replace('+', '')}?text=${message}`, '_blank');
    } else if (method.email) {
      // Email click
      window.location.href = `mailto:${method.email}?subject=Support Request - BeastBrowser&body=Hi Team,%0D%0A%0D%0AI need help with BeastBrowser. Please assist me.%0D%0A%0D%0AThank you!`;
    }
    setSelectedContact(method.id);
  };

  const handleSocialClick = (social: any) => {
    window.open(social.url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-green-100 to-blue-100">
            <HeadphonesIcon className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Professional Support Center
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Get expert help from our dedicated support team. We're here to ensure your BeastBrowser experience is seamless.
        </p>
      </div>

      {/* Support Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {supportFeatures.map((feature, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex justify-center mb-3">
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Methods */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Phone className="h-5 w-5" />
            Contact Support
          </CardTitle>
          <CardDescription>Get instant help through our multiple support channels</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contactMethods.map((method) => (
              <div key={method.id} className="relative">
                <Card className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-green-300 ${selectedContact === method.id ? 'ring-2 ring-green-500' : ''}`}>
                  <CardContent className="p-4 text-center" onClick={() => handleContactClick(method)}>
                    <div className={`w-12 h-12 rounded-full ${method.color} flex items-center justify-center mx-auto mb-3`}>
                      <span className="text-white">{method.icon}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{method.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded mb-2">
                      {method.number || method.email}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${method.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-muted-foreground">{method.hours}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Globe className="h-5 w-5" />
            Connect With Us
          </CardTitle>
          <CardDescription>Follow us for updates, tips, and community support</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialLinks.map((social) => (
              <Card key={social.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-300">
                <CardContent className="p-4" onClick={() => handleSocialClick(social)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${social.color} flex items-center justify-center`}>
                      <span className="text-white">{social.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{social.name}</h3>
                      <p className="text-sm text-muted-foreground">{social.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Visit</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time & Quality */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Response Time</h3>
            <p className="text-2xl font-bold text-blue-700">30 min</p>
            <p className="text-sm text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-6">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Resolution Rate</h3>
            <p className="text-2xl font-bold text-green-700">95%</p>
            <p className="text-sm text-muted-foreground">First contact resolution</p>
          </CardContent>
        </Card>

        <Card className="text-center bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-6">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Customer Rating</h3>
            <p className="text-2xl font-bold text-purple-700">4.9/5</p>
            <p className="text-sm text-muted-foreground">Based on 500+ reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <HelpCircle className="h-5 w-5" />
            Common Questions
          </CardTitle>
          <CardDescription>Quick answers to frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How quickly will I get a response?</h4>
                <p className="text-sm text-muted-foreground">
                  WhatsApp messages are typically answered within 30 minutes. Email responses take 2-4 hours.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What information should I provide?</h4>
                <p className="text-sm text-muted-foreground">
                  Please include your issue details, BeastBrowser version, and any error messages you're seeing.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Do you provide remote assistance?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, our team can provide remote assistance for complex technical issues.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Are there any support hours?</h4>
                <p className="text-sm text-muted-foreground">
                  WhatsApp support is available 24/7. Email support responds during business hours (9 AM - 9 PM IST).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTeam;