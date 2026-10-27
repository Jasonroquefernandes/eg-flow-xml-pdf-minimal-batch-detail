# **EG Flow — Product, UX & Application Design Brief**

## **1\. Your Role**

You are a senior product designer, UX architect, and enterprise SaaS systems designer.

Your task is to understand the following application called **EG Flow** and use this information as the foundation for designing/revamping its UX.

Do not jump directly into designing screens.

First understand:

* What EG Flow does  
* How it connects to other systems  
* How invoices move through the system  
* How batches work  
* How different ingestion methods behave  
* How backend and frontend stay synchronized  
* How failures are handled  
* How users recover from failures  
* How organization-level permissions work  
* How super-admin multi-organization access works

Then propose a coherent information architecture, user flows, navigation structure, screen hierarchy, component behavior, and interaction model.

Where something is ambiguous, identify the ambiguity instead of inventing a business rule.

---

# **2\. What Is EG Flow?**

EG Flow is an enterprise invoice-processing and dispatch application.

The basic purpose is:

**Invoice/customer data → XML → EG Flow → PDF → Review → Dispatch → End Customer**

EG Flow processes invoice XML files, converts/renders them into PDFs, allows the organization to review the resulting PDF when required, and then dispatches the invoice to the end customer.

The application currently has backend processing, but we are building/revamping a frontend application that reflects and controls that backend process.

The frontend and backend are connected.

This is important:

> The frontend is not merely a reporting dashboard.

Actions performed in the frontend should be reflected in the backend, and actions performed in the backend should be visible in the frontend.

For example:

* Uploading a file in the backend should make that batch visible in the frontend.  
* Starting rendering in the frontend should affect the backend.  
* Uploading a file in the frontend should make that batch available in the backend.  
* Processing performed by the backend should update the frontend.  
* A backend failure should appear in the frontend.  
* A batch processed through the backend should be controllable from the frontend where the corresponding action is supported.

The UI should therefore be treated as a **frontend representation and control layer over the EG Flow processing system**.

---

# **3\. Upstream System: Zenith**

EG Flow receives invoice/customer information from another product called **Zenith**.

Zenith stores customer and invoice-related information.

A simplified relationship is:

**Zenith → EG Flow**

For example, if an invoice is missing an email address:

1. EG Flow detects that the email is missing.  
2. The invoice cannot be dispatched.  
3. EG Flow reports the problem.  
4. The organization identifies the failed batch/invoice.  
5. The organization goes back to Zenith.  
6. They correct the missing email address in Zenith.  
7. They send the corrected information back to EG Flow.  
8. EG Flow creates a **new batch ID**.  
9. The original failed batch remains in the system.

The original failed batch is NOT deleted or overwritten.

This means the system has a relationship like:

**Failed Batch \#1001 → corrected/reprocessed as Batch \#1052**

The UI should make this relationship understandable to the user.

Do not merge the two records into one batch.

Instead, preserve both records and establish a clear relationship between them.

Example:

**Batch \#1001**

* Status: Failed  
* Failure reason: Missing email  
* Reprocessed as: Batch \#1052

**Batch \#1052**

* Status: Review  
* Created from: Batch \#1001

The exact terminology can be improved during UX design.

---

# **4\. Invoice Batch Concept**

EG Flow primarily operates around **batches**.

A batch can contain one or more invoices.

The UI should therefore make the batch the primary operational object unless there is a strong reason to expose individual invoices.

Users need to understand:

* Batch ID  
* Number of invoices  
* Current state  
* Processing status  
* Source  
* Failure information, if applicable  
* Relationship to previous/next batch  
* Available actions  
* Last updated information

The system can process a large volume of invoices, so the design needs to work for enterprise-scale usage.

Do not design only for a handful of batches.

The UI should remain usable when an organization has hundreds or thousands of batches.

---

# **5\. Three Ways a Batch Can Enter EG Flow**

There are currently three relevant ingestion/processing paths.

## **A. Manual Upload**

An organization user can manually upload an XML file through the EG Flow frontend.

The manual workflow is:

**Upload XML → Pending → Start → Rendering → PDF → Review → Dispatch**

Important:

Uploading the file does NOT automatically start rendering.

After upload, the batch remains in a pending state until the user explicitly chooses to start processing/rendering.

Example:

1. User uploads XML.  
2. Batch appears in EG Flow.  
3. State \= Pending.  
4. User clicks Start.  
5. Rendering begins.  
6. PDF is generated.  
7. PDF becomes available for review.  
8. User reviews PDF.  
9. User approves.  
10. User dispatches.

The UI must make it obvious why a pending batch has not progressed.

Do not make users wonder whether the system is broken.

---

# **6\. Zenith / Backend Processing**

A second path originates from the backend/Zenith.

In this scenario, the user does not necessarily perform a manual upload through the EG Flow frontend.

The backend processes the incoming data.

In some cases, the batch is already rendered and arrives at the review stage.

The user therefore sees:

**Batch → Review → Dispatch**

The PDF is immediately available for review.

There is no need for the user to press Start in this workflow.

The UI must therefore account for the fact that not every batch follows the same visible sequence.

Do NOT force every source into an identical interaction model if the underlying business process is different.

---

# **7\. SMTP Processing**

There is also an SMTP-based process.

SMTP processing happens automatically through the backend.

The user does not manually start rendering.

The general flow is:

**SMTP → Automatic Processing → PDF → Review → Dispatch**

The backend automatically starts processing and generates the PDF.

The user then reviews the PDF and dispatches it if review is enabled.

Again, the UI should represent what actually happened rather than displaying unnecessary controls.

---

# **8\. Review Configuration**

EG Flow has a setting that controls whether invoice review is required.

Review can be enabled or disabled.

## **Review enabled**

The process is:

**Processing → PDF → Review → Approve → Dispatch**

The organization reviews the PDF before dispatching it.

## **Review disabled**

The process can become:

**Processing → PDF → Automatic Dispatch**

The invoice is automatically dispatched after successful processing/rendering.

This setting is important because the UI cannot assume that every batch will always have a human review step.

The interface should adapt to the organization's configuration.

---

# **9\. Batch State vs Processing Status**

There are two concepts in the existing system that need to be represented carefully.

## **Batch State**

The high-level lifecycle/state.

Examples include:

* Pending  
* Rendering  
* Review  
* Dispatch  
* Completed  
* Failed

## **Processing Status**

The detailed technical progress inside a particular stage.

For example:

### **Rendering**

* Rendering Pending  
* Rendering Processing  
* Rendering Completed

### **PDF**

* PDF Pending  
* PDF Processing  
* PDF Completed

### **Review**

* Review Pending  
* Review Processing  
* Review Completed

### **Dispatch**

* Dispatch Pending  
* Dispatch Processing  
* Dispatch Completed

The backend may move through these technical statuses extremely quickly.

For small files, Pending and Processing may only exist for a fraction of a second.

Therefore:

**Do NOT expose every technical micro-state as a prominent UI state.**

The UI should prioritize meaningful user-facing states.

For example:

**Rendering → Review → Dispatch → Completed**

Technical processing information can be available as secondary information when useful.

---

# **10\. Recommended Status UX**

Use a clear high-level lifecycle/progress representation.

Example:

**Upload → Rendering → Review → Dispatch**

The current stage should be visually clear.

If rendering is currently happening:

**Rendering**  
Processing invoice batch...

Once complete:

**Review**  
PDF ready for review

When dispatching:

**Dispatch**  
Sending invoices...

When completed:

**Completed**  
Successfully dispatched

Transient states such as "processing" should not dominate the interface.

Users can leave the application while processing happens.

Therefore, the application should not depend on users watching a progress animation.

When they return, they should simply see the latest authoritative state.

A "Last updated" timestamp can be useful.

---

# **11\. Backend ↔ Frontend Synchronization**

This is a critical architectural UX requirement.

The frontend must reflect the backend's actual state.

For example:

### **Backend action**

A file is uploaded.

Frontend:

**Batch \#1234 — Pending**

### **Backend action**

Rendering is started.

Frontend:

**Batch \#1234 — Rendering**

### **Backend action**

Rendering completes.

Frontend:

**Batch \#1234 — Review**

### **Backend action**

Dispatch completes.

Frontend:

**Batch \#1234 — Completed**

The reverse should also work.

If the user uploads through the frontend, the backend must recognize/process that batch.

If the user starts processing through the frontend, the backend must reflect it.

The UI should therefore not create a fictional state that differs from backend reality.

The backend should be treated as the authoritative source of processing state.

---

# **12\. Error Handling**

Errors are a major part of the product.

A batch can fail for many different reasons.

There is no single dominant failure reason.

Examples could include:

* Missing customer information  
* Invalid data  
* Rendering failure  
* Dispatch failure  
* Missing email address  
* Other processing/integration errors

Do not design the system around one specific failure type.

The UX should accommodate many failure categories.

---

# **13\. Error Monitoring**

The current application has a dedicated section called:

**Error Monitoring**

This section contains failed batches.

Recommendation:

Keep **Error Monitoring as a dedicated operational view**, but do not completely isolate errors from the rest of the batch system.

The main batch experience can still support filtering by:

* All  
* Pending  
* Rendering  
* Review  
* Dispatch  
* Completed  
* Failed

The Error Monitoring view should be optimized for investigating problems.

It should answer:

1. What failed?  
2. Which batch failed?  
3. At which stage did it fail?  
4. Why did it fail?  
5. What should the organization do next?  
6. Has it been reprocessed?  
7. What is the new batch ID?

The UI should guide the user toward the correct resolution.

---

# **14\. Error Recovery**

EG Flow generally does not fix the underlying business/customer data itself.

The correction happens in **Zenith**.

Example:

Missing email:

**EG Flow**  
→ detects failure

**User**  
→ sees error in EG Flow

**Zenith**  
→ user corrects email

**Zenith**  
→ sends corrected data to EG Flow

**EG Flow**  
→ creates new batch

**Original batch**  
→ remains Failed

**New batch**  
→ continues through processing

The UI should therefore not show misleading actions such as:

"Fix Email"

if the actual fix must happen in Zenith.

Instead, use language such as:

**Fix in Zenith**

or:

**Customer information must be corrected in Zenith before reprocessing.**

The exact copy should be refined.

---

# **15\. Failed Batch → New Batch Relationship**

This is one of the most important UX requirements.

When a failed batch is corrected and resent, the system creates a new batch ID.

Example:

**Batch \#1001**  
Failed

↓

Data corrected in Zenith

↓

**Batch \#1052**  
New batch

The original batch remains.

The UI should make the relationship visible.

Recommended presentation:

### **Failed batch**

Status:  
**Failed**

Failure:  
**Missing email address**

Recovery:  
**Reprocessed as Batch \#1052**

### **New batch**

Status:  
**Review**

Relationship:  
**Created from failed Batch \#1001**

Both IDs should ideally be clickable.

Do not make the user manually search for the related batch.

---

# **16\. Unified Batch View vs Separate Views**

Recommended approach:

## **Main Batch View**

Use one unified batch list.

Users should be able to see batches from different sources together.

Provide filters such as:

* Status  
* Source  
* Date  
* Organization  
* Failed/Successful  
* Review required  
* Batch ID

The source can be displayed as a badge:

**Manual**

**Zenith**

**SMTP**

This avoids creating three completely separate mental models.

The underlying lifecycle is still broadly the same even though ingestion behavior differs.

## **Error Monitoring**

Keep this as a specialized operational view.

It is not a second batch system.

It is a focused view of failed batches.

This distinction is important.

---

# **17\. Source Visibility**

Every batch should have a clear source.

Potential values:

* Manual Upload  
* Zenith  
* SMTP

Do not hide this information.

However, source should not dominate the interface.

The user primarily needs to know:

**What is happening with this batch?**

The source is supporting context.

---

# **18\. Super Admin**

There is another important role:

**Super Admin**

A Super Admin can manage multiple organizations.

For example:

Super Admin

→ Organization A

→ Organization B

→ Organization C

→ Organization D

The Super Admin should be able to see an overview of all organizations under their management.

They should also be able to enter/select a specific organization and operate on behalf of that organization.

---

# **19\. Organization Selection**

A Super Admin must explicitly select the organization they want to operate on.

For example:

**Organization: Airtel ▼**

Once selected, the application operates within that organization's context.

This context must remain highly visible.

The user should never wonder:

> "Which organization am I currently managing?"

The selected organization should appear persistently in the application header/navigation.

---

# **20\. Super Admin UI**

Do NOT create an entirely separate application for Super Admin unless there is a strong business reason.

Prefer a shared application shell with role-based capabilities.

Regular organization user:

**EG Flow**  
→ their organization

Super Admin:

**EG Flow**  
→ Organization selector  
→ Global organization overview  
→ Organization management  
→ Feature/configuration controls  
→ Organization-specific EG Flow

The Super Admin sees additional capabilities, but the core batch-processing experience should remain familiar.

This reduces design and development duplication.

---

# **21\. Super Admin Safety**

Because a Super Admin can act on behalf of different organizations, cross-organization mistakes are a major UX risk.

Use multiple safeguards.

The organization context should be visible:

**Currently managing: Organization A**

For important actions, confirmation should repeat the organization.

Example:

**Upload batch for Organization A?**

This should be especially important for:

* Upload  
* Dispatch  
* Configuration changes  
* Feature changes  
* User/permission changes  
* Other consequential actions

Actions should also be attributable to the Super Admin where appropriate.

Do not make it appear as though the organization's employee performed an action when it was actually performed by a Super Admin.

---

# **22\. Organization-Level Feature Controls**

The Super Admin can control which features/functionality are available to each organization.

Therefore, feature availability may differ between organizations.

The UI should support:

**Organization A**

* Review: ON  
* Manual Upload: ON  
* Feature X: OFF

**Organization B**

* Review: OFF  
* Manual Upload: ON  
* Feature X: ON

Do not assume every organization has exactly the same configuration.

However, avoid making the interface visually inconsistent.

Disabled/unavailable functionality should be handled predictably.

---

# **23\. Recommended Information Architecture**

A potential structure:

### **Global**

* Organizations  
* Organization Overview  
* Settings

### **Organization Context**

* Dashboard / Overview  
* Batches  
* Review  
* Error Monitoring  
* Settings

Depending on the actual business requirements, Review may be a filtered queue rather than a completely separate entity.

The goal is to avoid excessive navigation.

The user should be able to answer quickly:

**What needs my attention?**

---

# **24\. Dashboard / Overview**

The dashboard should not simply display statistics.

It should help users understand operational health.

Potential high-level information:

* Total batches  
* Processing  
* Awaiting review  
* Failed  
* Completed  
* Dispatch issues  
* Recent activity

Potential quick actions:

* Review pending batches  
* View errors  
* View recent batches  
* Upload batch

For Super Admin, the overview can additionally show:

* Organizations  
* Organization status  
* Organization-level processing volume  
* Organizations with errors  
* Organizations requiring attention

Do not overload the dashboard with unnecessary analytics unless users actually need them.

---

# **25\. Batch List**

The batch list should be designed for high-volume enterprise use.

Recommended columns/information:

* Batch ID  
* Source  
* Number of invoices  
* Current state  
* Status  
* Created/received time  
* Last updated  
* Error indicator  
* Related batch, if applicable  
* Actions

Potential filters:

* Organization  
* Source  
* State  
* Status  
* Date range  
* Failed  
* Review required  
* Batch ID

Search should be prominent because users may know the batch ID.

---

# **26\. Batch Detail**

A batch detail page should tell the complete story.

Recommended structure:

### **Header**

Batch ID

Status

Source

Organization

### **Lifecycle**

Upload

→ Rendering

→ Review

→ Dispatch

→ Completed

### **Details**

Number of invoices

Created

Last updated

Source

Processing information

### **Error section**

If failed:

Failure reason

Failed stage

Recommended next action

### **Relationship**

If this batch originated from another failed batch:

**Created from Batch \#1234**

If this batch failed and was reprocessed:

**Reprocessed as Batch \#5678**

### **Actions**

Only show actions that are valid for the current state and organization configuration.

---

# **27\. Actions Should Be State-Aware**

Do not show every action all the time.

For example:

Pending manual upload:

**Start rendering**

Rendering:

No Start button.

Review:

**Approve**

**Dispatch**

Completed:

No unnecessary dispatch button.

Failed:

Show appropriate recovery guidance.

The interface should make invalid actions unavailable rather than allowing users to click them and discover an error afterward.

---

# **28\. What NOT To Do**

Avoid:

### **1\. Separate applications for every ingestion source**

Do not create completely separate workflows for Manual, Zenith, and SMTP.

### **2\. Showing every backend micro-status prominently**

Users do not need to watch:

Pending → Processing → Completed

when these happen almost instantly.

### **3\. Hiding the source**

Users should be able to understand where a batch came from.

### **4\. Overwriting failed batches**

Failed batches need to remain available for reference.

### **5\. Treating a retry as the same batch**

A corrected resend creates a new batch ID.

Keep the relationship explicit instead.

### **6\. Making users manually find the related batch**

Link failed and reprocessed batches.

### **7\. Offering incorrect recovery actions**

If the data must be fixed in Zenith, do not pretend the user can fix it inside EG Flow.

### **8\. Creating a completely different Super Admin application**

Prefer role-based capabilities within the same core product.

### **9\. Hiding organization context**

A Super Admin must always know which organization they are acting on behalf of.

### **10\. Designing only for low volume**

This is an enterprise application with potentially very large invoice/batch volumes.

---

# **29\. UX Principles**

Use these principles throughout the design.

## **Clarity over technical accuracy**

The backend may have many technical states.

The frontend should translate those into understandable user-facing states.

## **One mental model**

Users should understand:

**Batch → Processing → Review → Dispatch → Completed**

regardless of where the batch originated.

## **Source is context**

Manual, Zenith, and SMTP should be visible but should not create unnecessary fragmentation.

## **Errors are actionable**

An error should answer:

**What happened? Why? What should I do next?**

## **Preserve history**

Failed and reprocessed batches should remain traceable.

## **Avoid unnecessary actions**

Only present actions relevant to the current state.

## **Persistent context**

Especially for Super Admin, always show the current organization.

## **Enterprise scalability**

Design for hundreds/thousands of batches.

Use search, filters, sorting, pagination/virtualization where appropriate.

## **Don't make users watch processing**

Users can leave and return later.

The latest backend state should be authoritative.

---

# **30\. Your Design Task**

Based on all of the above, design a complete UX architecture for EG Flow.

Do NOT immediately jump into polished UI screens.

First provide:

### **A. Product understanding**

Explain your understanding of EG Flow and identify any assumptions.

### **B. Information architecture**

Define the navigation and hierarchy.

### **C. User roles**

Define:

* Organization User  
* Super Admin

Explain their permissions and differences.

### **D. User flows**

Create detailed flows for:

1. Manual XML upload  
2. Zenith → EG Flow  
3. SMTP → EG Flow  
4. Review enabled  
5. Review disabled  
6. Successful dispatch  
7. Failed batch  
8. Fix in Zenith → resend  
9. Failed batch → new batch relationship  
10. Super Admin → organization selection  
11. Super Admin → organization overview  
12. Super Admin → act on behalf of organization  
13. Super Admin → organization feature configuration

### **E. State model**

Create a clear model showing:

**High-level state**

vs.

**technical processing status**

Explain which should be visible in the main UI and which should remain secondary.

### **F. Screen architecture**

Recommend the key screens and what each screen should contain.

### **G. Batch list**

Define the columns, filters, sorting, badges, actions, and empty/loading/error states.

### **H. Batch detail**

Define the lifecycle visualization, metadata, errors, actions, and related-batch relationship.

### **I. Error Monitoring**

Design the dedicated error-monitoring experience.

### **J. Super Admin experience**

Design the multi-organization experience and organization switcher.

### **K. UX edge cases**

Identify important edge cases that have not yet been explicitly defined.

For each one, explain the UX question that needs a product decision.

### **L. Recommendations**

Challenge the current assumptions where necessary.

Do not blindly agree with the proposed structure.

If a better UX pattern exists, explain why.

---

# **31\. Important Design Constraint**

The final design should feel like a **professional enterprise SaaS product**, not a generic admin dashboard.

Prioritize:

* Operational clarity  
* High-volume workflows  
* Fast scanning  
* Clear hierarchy  
* Strong state visibility  
* Safe actions  
* Traceability  
* Role-based access  
* Organization context  
* Error recovery  
* Minimal cognitive load

Avoid unnecessary visual complexity.

The goal is not to show everything the backend knows.

The goal is to show users **what they need to know and what they need to do next**.

Before proposing the final UI, identify any contradictions or missing business rules in this specification and list the questions that should be answered by the product team.

