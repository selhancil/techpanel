from dash import html, dcc

def get_sidebar() -> html.Div:
    """Returns the layout for the left sidebar navigation."""

    sidebar_style = {
        "position": "fixed",
        "top": 0,
        "left": 0,
        "bottom": 0,
        "width": "260px",
        "padding": "32px 24px",
        "backgroundColor": "var(--bg-sidebar)",
        "borderRight": "1px solid var(--border-light)",
        "display": "flex",
        "flexDirection": "column",
        "zIndex": 1000,
    }

    return html.Div(
        style=sidebar_style,
        children=[
            # Logo / Branding
            html.Div(
                style={"marginBottom": "40px", "padding": "0 16px"},
                children=[
                    html.H3("TechPanel", style={"fontWeight": "700", "color": "var(--accent-green)", "margin": 0}),
                    html.Span("Analysis Dashboard", style={"fontSize": "0.85rem", "color": "var(--text-muted)"})
                ],
            ),

            # Navigation Links
            html.Div(
                style={"display": "flex", "flexDirection": "column"},
                children=[
                    dcc.Link(
                        "📊 Dashboard",
                        href="/",
                        className="sidebar-link"
                    ),
                    dcc.Link(
                        "⚙️ Manage Assets",
                        href="/assets",
                        className="sidebar-link"
                    ),
                ],
            ),

            # Watchlist section
            html.Div(
                style={
                    "marginTop": "16px",
                    "borderTop": "1px solid rgba(255,255,255,0.06)",
                    "paddingTop": "16px",
                    "overflowY": "auto",
                    "flexGrow": 1,
                    "minHeight": 0,
                },
                children=[
                    html.Div(
                        style={"padding": "0 16px", "marginBottom": "12px"},
                        children=html.Span(
                            "WATCHLIST",
                            style={
                                "fontSize": "0.75rem",
                                "fontWeight": "700",
                                "color": "var(--text-muted)",
                                "letterSpacing": "0.05em",
                            },
                        ),
                    ),
                    html.Div(id="watchlist-tree"),
                ],
            ),

            # Bottom section
            html.Div(
                style={"marginTop": "auto", "padding": "16px", "color": "var(--text-muted)", "fontSize": "0.85rem", "textAlign": "center"},
                children="v1.0.0"
            )
        ]
    )
