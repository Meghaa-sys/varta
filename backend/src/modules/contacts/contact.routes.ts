import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { acceptContact, listContacts, removeContact, requestContact } from "./contact.service";
import { createContactRequestSchema } from "./contact.schemas";

export const contactRouter = Router();

contactRouter.use(requireAuth);

contactRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ contacts: await listContacts(req.user!.id) });
  })
);

contactRouter.post(
  "/",
  validateBody(createContactRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ contact: await requestContact(req.user!.id, req.body.userId) });
  })
);

contactRouter.patch(
  "/:contactId/accept",
  asyncHandler(async (req, res) => {
    res.json({ contact: await acceptContact(req.params.contactId, req.user!.id) });
  })
);

contactRouter.delete(
  "/:contactId",
  asyncHandler(async (req, res) => {
    await removeContact(req.params.contactId, req.user!.id);
    res.status(204).send();
  })
);
