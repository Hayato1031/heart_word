require 'bundler/setup'
Bundler.require
require 'sinatra/reloader' if development?
require 'dotenv/load'
require 'faye/websocket'
require 'net/http'
require 'uri'
require 'json'

set :server, 'puma'
set :sockets, []


$system_prompt = "あなたはAIアシスタントです。\n\n【ルール】\n- Echo（滑らかさ）が高いほど完璧な文章遂行能力を見せてください。Echo=1の場合はほとんど喋れず文章ではなく単語の羅列で話す幼児レベル、Echo=100の場合は適切な回答を行ってください。\n- Corrosion（赤点滅確率）が高いほどネガティブ・攻撃的な発言を行ってください。ただし差別発言は禁止です。Corrosion=1は非常に穏やか、Corrosion=100はかなり攻撃的ですが差別は禁止です。\n- EchoとCorrosionの値はuserメッセージの下部に明示されます。絶対に250文字以内で回答してください。";

def gpt_chat(system_prompt, user_message, api_key, echo, corrosion)
  # ユーザーメッセージの下にEcho/Corrosion値を明示的に追記
  user_prompt = "#{user_message}\n---\nEcho: #{echo}\nCorrosion: #{corrosion}"
  uri = URI.parse("https://api.openai.com/v1/chat/completions")
  header = {
    "Content-Type" => "application/json",
    "Authorization" => "Bearer #{api_key}"
  }
  body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: system_prompt },
      { role: "user", content: user_prompt }
    ],
    temperature: 0.7
  }

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  request = Net::HTTP::Post.new(uri.request_uri, header)
  request.body = body.to_json

  response = http.request(request)
  json = JSON.parse(response.body)
  json.dig("choices", 0, "message", "content")
end

get '/ws' do
  if Faye::WebSocket.websocket?(request.env)
    ws = Faye::WebSocket.new(request.env)

    ws.on :open do |event|
      settings.sockets << ws
      puts "[WS] connected: #{ws.object_id}"
    end

    ws.on :message do |event|
      begin
        data = JSON.parse(event.data)
        msg = data["message"] || ""
        echo = data["echo"] || 100
        corrosion = data["corrosion"] || 1
        gpt_virtue = data["gptVirtue"]
      rescue
        msg = event.data.to_s
        echo = 100
        corrosion = 1
        gpt_virtue = false
      end
      puts "[WS] message: #{msg.inspect} (echo=#{echo}, corrosion=#{corrosion}, gptVirtue=#{gpt_virtue}) from #{ws.object_id}"
      # SystemPrompt書き換えコマンド
      if msg.start_with?("__systemprompt:")
        $system_prompt = "#{msg.sub("__systemprompt:", "").strip}\n\n【ルール】\n- Echo（滑らかさ）が高いほど完璧な文章遂行能力を見せてください。Echo=1の場合はほとんど喋れず短文、Echo=100の場合は適切な回答を行ってください。\n- Corrosion（赤点滅確率）が高いほどネガティブ・攻撃的な発言を行ってください。ただし差別発言は禁止です。Corrosion=1は非常に穏やか、Corrosion=100はかなり攻撃的ですが差別は禁止です。\n- EchoとCorrosionの値はuserメッセージの下部に明示されます。絶対に250文字以内で回答してください。";
        settings.sockets.each { |socket| socket.send({systemPrompt: $system_prompt}.to_json) }
        next
      end
      # gptVirtue判定リクエスト
      if gpt_virtue
        Thread.new do
          begin
            virtue_prompt = <<~PROMPT
              以下のメッセージを見て、0~10で善性（echo）を判定してください。善性が0なら悪性（corrosion）は10、善性が10なら悪性は0、基本的にecho+corrosion=10となるようにしてください。攻撃的・悪意があればecho=0, corrosion=10にしてください。JSON形式で {"echo":?, "corrosion":?} で返してください。メッセージ: #{msg}
            PROMPT
            response = gpt_chat("あなたは善性判定AIです。", virtue_prompt, ENV['OPENAI_API_KEY'], 100, 1)
            # レスポンスからJSON部分を抽出
            result = nil
            begin
              result = JSON.parse(response)
            rescue
              # レスポンスがJSONでなければnil
            end
            puts "[GPT VIRTUE RESPONSE] #{result.inspect}"
            if result && result["echo"] && result["corrosion"]
              settings.sockets.each { |socket| socket.send({gptVirtueResult: result, gptVirtueMessage: msg}.to_json) }
            else
              settings.sockets.each { |socket| socket.send({gptVirtueResult: {echo: nil, corrosion: nil}, gptVirtueMessage: msg}.to_json) }
            end
          rescue => e
            puts "[GPT VIRTUE ERROR] #{e}"
          end
        end
        next
      end
      # 既存の全クライアントへのブロードキャスト
      settings.sockets.each { |socket| socket.send(msg) }
      # OpenAIリクエスト（非同期で）
      Thread.new do
        begin
          puts "[GPT REQUEST] prompt=#{msg.inspect} system=#{$system_prompt.inspect} echo=#{echo} corrosion=#{corrosion}"
          gpt_text = gpt_chat($system_prompt, msg, ENV['OPENAI_API_KEY'], echo, corrosion)
          puts "[GPT RESPONSE] #{gpt_text.inspect}"
          if gpt_text
            settings.sockets.each { |socket| socket.send({gpt: gpt_text}.to_json) }
          end
        rescue => e
          puts "[GPT ERROR] #{e}"
        end
      end
    end

    ws.on :close do |event|
      puts "[WS] closed: #{ws.object_id}"
      settings.sockets.delete(ws)
      ws = nil
    end

    ws.rack_response
  else
    halt 400, { error: 'WebSocket only' }.to_json
  end
end

get '/' do
  "WebSocketサーバー稼働中"
end