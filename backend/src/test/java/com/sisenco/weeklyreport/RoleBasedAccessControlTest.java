package com.sisenco.weeklyreport;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import java.time.DayOfWeek;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Role-based access control, exercised through the real HTTP stack.
 *
 * <p>Requests go through MockMvc against a Testcontainers MySQL, and every one
 * of them authenticates the way a browser does — by logging in and replaying
 * the httpOnly session cookie. Nothing here stubs the security context, so a
 * misconfigured filter chain or a missing annotation fails the test rather than
 * being papered over by {@code @WithMockUser}.
 *
 * <p>The demo seed and the bootstrap manager are switched off so each test
 * starts from a known three-person team rather than 28 seeded reports.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(
        properties = {
            "app.seed.enabled=false",
            "app.bootstrap.manager.enabled=false",
            // Pinned empty so a developer who has GROQ_API_KEY exported
            // does not turn these tests into live calls to a paid API.
            "app.ai.api-key="
        })
@Transactional
@DisplayName("Role-based access control")
class RoleBasedAccessControlTest {

    private static final String MANAGER = "manager@test.local";
    private static final String OWNER = "owner@test.local";
    private static final String OTHER = "other@test.local";
    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Only present so the seeder cannot run against the test database. */
    @MockitoBean
    private com.sisenco.weeklyreport.config.DataSeeder dataSeeder;

    private Cookie managerSession;
    private Cookie ownerSession;
    private Cookie otherSession;

    /** A Monday, because the API accepts no other day as a week start. */
    private final LocalDate week = LocalDate.now().with(DayOfWeek.MONDAY).minusWeeks(3);

    @BeforeEach
    void setUp() throws Exception {
        createUser("Team Manager", MANAGER, Role.MANAGER);
        createUser("Report Owner", OWNER, Role.MEMBER);
        createUser("Other Member", OTHER, Role.MEMBER);

        managerSession = login(MANAGER);
        ownerSession = login(OWNER);
        otherSession = login(OTHER);
    }

    // ------------------------------------------------------------- anonymous

    @Nested
    @DisplayName("Without a session")
    class Anonymous {

        @Test
        @DisplayName("every protected endpoint answers 401")
        void protectedEndpointsRequireASession() throws Exception {
            mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/reports/mine")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/manager/reports")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/manager/dashboard/summary")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/manager/chat/status")).andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("a forged cookie is rejected rather than trusted")
        void aForgedTokenIsRejected() throws Exception {
            mockMvc.perform(get("/api/auth/me").cookie(new Cookie("wr_token", "not.a.real.token")))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ---------------------------------------------------------------- member

    @Nested
    @DisplayName("A member")
    class MemberBoundaries {

        @Test
        @DisplayName("cannot reach any manager-only endpoint")
        void cannotReachManagerEndpoints() throws Exception {
            mockMvc.perform(get("/api/manager/reports").cookie(ownerSession))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/manager/dashboard/summary").cookie(ownerSession))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/manager/dashboard/submissions").cookie(ownerSession))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/users").cookie(ownerSession)).andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot reach the AI assistant, which is scoped to managers")
        void cannotReachTheAssistant() throws Exception {
            mockMvc.perform(get("/api/manager/chat/status").cookie(ownerSession))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/manager/chat")
                            .cookie(ownerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"What did the team do last week?\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot review a report")
        void cannotReviewAReport() throws Exception {
            long reportId = createDraftAs(ownerSession);
            submitAs(ownerSession, reportId);

            mockMvc.perform(post("/api/manager/reports/" + reportId + "/review")
                            .cookie(otherSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"action\":\"APPROVE\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot write a project, but may read the list to tag a report")
        void cannotWriteProjects() throws Exception {
            mockMvc.perform(get("/api/projects").cookie(ownerSession)).andExpect(status().isOk());

            mockMvc.perform(post("/api/projects")
                            .cookie(ownerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Sneaky\",\"code\":\"SNEAK\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot see another member's report at all")
        void cannotReadAnotherMembersReport() throws Exception {
            long reportId = createDraftAs(ownerSession);

            // 404 rather than 403 on purpose: a 403 would confirm the id exists.
            mockMvc.perform(get("/api/reports/" + reportId).cookie(otherSession))
                    .andExpect(status().isNotFound());
            mockMvc.perform(get("/api/reports/" + reportId + "/versions").cookie(otherSession))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("cannot edit or submit another member's report")
        void cannotWriteAnotherMembersReport() throws Exception {
            long reportId = createDraftAs(ownerSession);

            mockMvc.perform(put("/api/reports/" + reportId)
                            .cookie(otherSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportPayload()))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/api/reports/" + reportId + "/submit").cookie(otherSession))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("sees only their own reports in their history")
        void seesOnlyTheirOwnHistory() throws Exception {
            createDraftAs(ownerSession);

            mockMvc.perform(get("/api/reports/mine").cookie(otherSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));

            mockMvc.perform(get("/api/reports/mine").cookie(ownerSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        @DisplayName("can read and edit their own report")
        void canWorkOnTheirOwnReport() throws Exception {
            long reportId = createDraftAs(ownerSession);

            mockMvc.perform(get("/api/reports/" + reportId).cookie(ownerSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.editable").value(true));

            mockMvc.perform(put("/api/reports/" + reportId)
                            .cookie(ownerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportPayload()))
                    .andExpect(status().isOk());
        }
    }

    // --------------------------------------------------------------- manager

    @Nested
    @DisplayName("A manager")
    class ManagerBoundaries {

        @Test
        @DisplayName("cannot file a report of their own")
        void cannotFileReports() throws Exception {
            mockMvc.perform(post("/api/reports")
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportPayload()))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/reports/mine").cookie(managerSession))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot rewrite a member's report content")
        void cannotEditSomeoneElsesContent() throws Exception {
            long reportId = createDraftAs(ownerSession);
            submitAs(ownerSession, reportId);

            mockMvc.perform(put("/api/reports/" + reportId)
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportPayload()))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/api/reports/" + reportId + "/submit").cookie(managerSession))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("cannot open a member's draft, but can read it once submitted")
        void draftsAreOwnerOnly() throws Exception {
            long reportId = createDraftAs(ownerSession);

            mockMvc.perform(get("/api/reports/" + reportId).cookie(managerSession))
                    .andExpect(status().isNotFound());
            mockMvc.perform(get("/api/manager/reports").cookie(managerSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));

            submitAs(ownerSession, reportId);

            mockMvc.perform(get("/api/reports/" + reportId).cookie(managerSession))
                    .andExpect(status().isOk())
                    // Visible, but not theirs to change.
                    .andExpect(jsonPath("$.editable").value(false));
            mockMvc.perform(get("/api/manager/reports").cookie(managerSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        @DisplayName("can review a submitted report")
        void canReviewASubmittedReport() throws Exception {
            long reportId = createDraftAs(ownerSession);
            submitAs(ownerSession, reportId);

            mockMvc.perform(post("/api/manager/reports/" + reportId + "/review")
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"action\":\"REQUEST_CHANGES\",\"comment\":\"Please add the hours.\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("NEEDS_CORRECTION"))
                    // The correction opened a fresh version rather than
                    // overwriting the one that was reviewed.
                    .andExpect(jsonPath("$.versions.length()").value(2));
        }

        @Test
        @DisplayName("gets a clean 503 from the assistant when no API key is configured")
        void theAssistantDegradesWithoutAKey() throws Exception {
            // The feature is optional, so a checkout with no key must still run:
            // the endpoint says it is unavailable rather than failing at startup.
            mockMvc.perform(get("/api/manager/chat/status").cookie(managerSession))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.available").value(false));

            mockMvc.perform(post("/api/manager/chat")
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"What did the team do last week?\"}"))
                    .andExpect(status().isServiceUnavailable());
        }

        @Test
        @DisplayName("still has to send a question the assistant can answer")
        void theAssistantValidatesItsInput() throws Exception {
            mockMvc.perform(post("/api/manager/chat")
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"   \"}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("cannot change their own role")
        void cannotChangeTheirOwnRole() throws Exception {
            Long managerId = userRepository.findByEmailIgnoreCase(MANAGER).orElseThrow().getId();

            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .patch("/api/users/" + managerId + "/role")
                            .cookie(managerSession)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"role\":\"MEMBER\"}"))
                    .andExpect(status().isConflict());
        }
    }

    // --------------------------------------------------------------- helpers

    private void createUser(String name, String email, Role role) {
        userRepository.save(User.builder()
                .name(name)
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(role)
                .active(true)
                .build());
    }

    /** Signs in for real and returns the session cookie the browser would get. */
    private Cookie login(String email) throws Exception {
        Cookie cookie = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("wr_token");

        assertNotNull(cookie, "login should issue a session cookie for " + email);
        return cookie;
    }

    private long createDraftAs(Cookie session) throws Exception {
        String body = mockMvc.perform(post("/api/reports")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportPayload()))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Small enough to read the id out directly rather than pull in a mapper.
        int start = body.indexOf(":") + 1;
        return Long.parseLong(body.substring(start, body.indexOf(",", start)).trim());
    }

    private void submitAs(Cookie session, long reportId) throws Exception {
        mockMvc.perform(post("/api/reports/" + reportId + "/submit").cookie(session))
                .andExpect(status().isOk());
    }

    private String reportPayload() {
        return """
                {
                  "weekStart": "%s",
                  "projectId": null,
                  "tasks": [{
                    "name": "Ship the reconciliation endpoint",
                    "priority": "HIGH",
                    "plannedPct": 100,
                    "actualPct": 100,
                    "status": "COMPLETED",
                    "hoursPlanned": 8,
                    "hoursSpent": 7,
                    "deliverable": "PR #21"
                  }],
                  "nextWeekPlan": "Start on refunds.",
                  "blockers": [],
                  "achievements": [],
                  "hours": [],
                  "notes": null,
                  "links": null
                }
                """
                .formatted(week);
    }
}
