import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AISalesOrchestrator, aiSalesOrchestrator } from '../services/aiSalesOrchestrator';
import { whatsappService } from '../services/whatsappService';

vi.mock('../services/whatsappService', () => ({
    whatsappService: {
        sendTextMessage: vi.fn().mockResolvedValue(true),
        sendInteractiveButtonMessage: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('@clickflash/ai', () => {
    const mockChat = vi.fn();
    return {
        GeminiClient: class {
            chat = mockChat;
        },
    };
});

describe('AISalesOrchestrator & WhatsApp Closer/Negotiator Swarm', () => {
    let orchestrator: AISalesOrchestrator;
    let mockGeminiChat: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new AISalesOrchestrator();
        mockGeminiChat = (orchestrator as any).client.chat;
    });

    describe('Lead Pipeline & Swarm Hunting', () => {
        it('skips engagement records without customerPhone or whatsappOptIn', async () => {
            const records = [
                { customerEmail: 'test1@ex.com', customerPhone: '', whatsappOptIn: true },
                { customerEmail: 'test2@ex.com', customerPhone: '+1234567890', whatsappOptIn: false },
            ];

            await orchestrator.huntForLeads(records);

            expect(mockGeminiChat).not.toHaveBeenCalled();
            expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
        });

        it('qualifies hot leads through Analyst Agent and triggers Closer Agent to dispatch WhatsApp discount', async () => {
            const hotRecord = {
                customerEmail: 'guest_hot@resort.com',
                customerPhone: '+15554321098',
                customerName: 'Sarah Connor',
                resortName: 'Atlantis Resort',
                topActivity: 'Dolphin Encounter',
                whatsappOptIn: true,
                totalOpened: 4,
                favoritesCount: 6,
            };

            // 1. Mock Analyst Agent response
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    isHotLead: true,
                    reason: 'High engagement with 6 favorites and 4 gallery opens',
                }),
            });

            // 2. Mock Closer Agent response (with markdown code block formatting)
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: '```json\n{\n  "whatsapp": "Hey Sarah! Relive your Dolphin Encounter with 20% off all photos today! Use code MEMORIES20: https://gallery.clickflash.com",\n  "emailSubject": "Your 20% Discount for Atlantis Photos",\n  "emailHtml": "<p>Unlock memories</p>"\n}\n```',
            });

            await orchestrator.huntForLeads([hotRecord]);

            // Analyst and Closer were queried
            expect(mockGeminiChat).toHaveBeenCalledTimes(2);

            // WhatsApp Closer was dispatched with interactive buttons
            expect(whatsappService.sendInteractiveButtonMessage).toHaveBeenCalledWith(
                '+15554321098',
                expect.stringContaining('MEMORIES20'),
                expect.any(Array)
            );
        });

        it('does not trigger Closer Agent when Analyst Agent determines customer is not ready', async () => {
            const coldRecord = {
                customerEmail: 'cold@resort.com',
                customerPhone: '+15550001122',
                whatsappOptIn: true,
                totalOpened: 1,
                favoritesCount: 0,
            };

            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    isHotLead: false,
                    reason: 'Low engagement threshold',
                }),
            });

            await orchestrator.huntForLeads([coldRecord]);

            expect(mockGeminiChat).toHaveBeenCalledTimes(1);
            expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
            expect(whatsappService.sendInteractiveButtonMessage).not.toHaveBeenCalled();
        });

        it('handles malformed JSON from Analyst Agent gracefully without crashing', async () => {
            const record = {
                customerEmail: 'guest@ex.com',
                customerPhone: '+15551112233',
                whatsappOptIn: true,
            };

            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: 'Not valid JSON response from LLM',
            });

            await orchestrator.huntForLeads([record]);

            expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
        });
    });

    describe('Negotiator Agent & Customer Reply Handling', () => {
        it('handles incoming customer objections and answers questions with tailored negotiation response', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: 'All digital downloads include full high-resolution rights and instant cloud delivery! Use your MEMORIES20 code before midnight to save 20%.',
            });

            const conversationHistory = [
                { role: 'assistant', content: 'Special 20% discount on your photos!' },
            ];

            await orchestrator.handleIncomingReply(
                '+15559876543',
                'Are the photos full resolution or compressed?',
                conversationHistory
            );

            expect(mockGeminiChat).toHaveBeenCalledWith(
                [
                    { role: 'assistant', content: 'Special 20% discount on your photos!' },
                    { role: 'user', content: 'Are the photos full resolution or compressed?' },
                ],
                expect.stringContaining('customer service agent')
            );

            expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
                '+15559876543',
                'All digital downloads include full high-resolution rights and instant cloud delivery! Use your MEMORIES20 code before midnight to save 20%.'
            );
        });

        it('dispatches fallback reassurance message if Gemini LLM call fails or times out', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: false,
                data: null,
            });

            await orchestrator.handleIncomingReply(
                '+15559876543',
                'Can I get help with group tickets?'
            );

            expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
                '+15559876543',
                'Thanks for reaching out! Our team is reviewing your message and will get back to you shortly.'
            );
        });
    });

    describe('Default Export', () => {
        it('exports default aiSalesOrchestrator instance', () => {
            expect(aiSalesOrchestrator).toBeInstanceOf(AISalesOrchestrator);
        });
    });
});
