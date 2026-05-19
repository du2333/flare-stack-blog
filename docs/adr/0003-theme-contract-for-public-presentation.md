# Use a Theme Contract for public presentation

Public blog pages use a Theme Contract so themes can replace presentation, layouts, and page components without taking ownership of routing, data loading, permissions, or content-management logic. This keeps theme development powerful but bounded: themes consume prepared public data and Site Config, while admin workflows and domain behavior stay outside the theme layer.
