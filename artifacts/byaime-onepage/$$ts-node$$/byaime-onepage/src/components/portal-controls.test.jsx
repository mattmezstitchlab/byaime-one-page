import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { PortalControls } from "./PortalControls";
// Mock the context
vi.mock("@/store/project-store", () => ({
    useProject: () => ({
        project: {
            id: "project-1",
            title: "Test World",
            city: { value: "Paris" },
            venue: { value: null },
            pivot: { value: 1716110000000 },
            guests: [],
            messageTemplates: [],
            tasks: [],
            tables: [],
            providers: [],
            payments: [],
            documents: [],
            communications: [],
            timeline: [],
            logistics: { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] },
            ceremony: { structure: [], notes: "", readings: [], vows: [], traditions: [], menu: "", drinks: "", cake: "", firstDance: "" },
            music: [],
            team: [],
            memories: [],
            messageLogs: [],
            media: [],
            messages: [],
            missing: []
        },
        projects: [{ id: "project-1", title: "Test World", role: "owner" }],
        currentRole: "owner",
        canEdit: true,
    }),
}));
vi.mock("@clerk/react", () => ({
    useClerk: () => ({
        openUserProfile: vi.fn(),
        signOut: vi.fn(),
    }),
    useUser: () => ({
        user: {
            id: "user-1",
            fullName: "Test User",
            primaryEmailAddress: { emailAddress: "test@example.com" },
            externalAccounts: [],
        },
    }),
}));
describe("PortalControls", () => {
    beforeAll(() => {
        // @ts-ignore
        global.window = { location: { pathname: "/user-portal" } };
    });
    it("renders without crashing when project is present", () => {
        const markup = renderToStaticMarkup(<PortalControls embedded={false}/>);
        expect(markup).toContain('data-testid="sync-status"');
        expect(markup).toContain('data-testid="settings-open"');
    });
});
//# sourceMappingURL=portal-controls.test.jsx.map